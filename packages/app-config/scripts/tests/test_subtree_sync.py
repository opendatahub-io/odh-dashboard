"""Offline regressions: python3 -m unittest discover -s packages/app-config/scripts/tests -v."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[4]
HELPER = ROOT / 'packages/app-config/scripts/package-subtree-common.sh'
WORKFLOW = ROOT / '.github/workflows/model-registry-upstream-sync.yml'


def run_block(name):
    step = WORKFLOW.read_text().split(f'      - name: {name}\n', 1)[1].split('      - name:', 1)[0]
    return '\n'.join(line[10:] for line in step.split('        run: |\n', 1)[1].splitlines())


class SubtreeSyncTest(unittest.TestCase):
    def test_pipeline_and_outcome(self):
        for dirty, strict, expected in [(False, '1', 'noop'), (True, '1', 'failed'), (True, '0', 'noop')]:
            with self.subTest(dirty=dirty, strict=strict), tempfile.TemporaryDirectory() as tmp:
                repo = Path(tmp) / 'repo'
                repo.mkdir()
                subprocess.run(['git', 'init', '-q', str(repo)], check=True)
                if dirty:
                    (repo / 'untracked').touch()
                env = dict(os.environ, RUNNER_TEMP=tmp, GITHUB_OUTPUT=str(Path(tmp) / 'output'),
                           SUBTREE_STRICT_EXIT=strict, npm_config_user_agent='pnpm/11.22.0', NO_COLOR='1')
                # Execute the workflow's pipeline using the real shared working-tree check.
                pipeline = run_block('Run subtree sync').replace('${{ env.PACKAGE_NAME }}', 'fixture')
                setup = f'''pnpm() {{ bash -c 'source "$1"; check_working_tree_clean' _ '{HELPER}'; }}\n'''
                result = subprocess.run(['bash', '-o', 'pipefail', '-c', setup + pipeline], cwd=repo, env=env,
                                        capture_output=True, text=True)
                self.assertEqual(result.returncode != 0, dirty and strict == '1')
                self.assertTrue((Path(tmp) / 'sync-output.txt').exists())
                self.assertFalse((repo / 'sync-output.txt').exists())
                status = subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo, text=True)
                self.assertEqual(status.strip(), '?? untracked' if dirty else '')
                outcome = run_block('Detect sync outcome').replace('${{ env.PACKAGE_DIR }}', '.')
                outcome = outcome.replace('${{ steps.sync.outcome }}', 'success' if result.returncode == 0 else 'failure')
                outcome = outcome.replace('${{ steps.current.outputs.commit }}', 'abc')
                # Supply only package metadata; failure/no-op must be decided before revision inspection.
                (repo / 'package.json').write_text('{"subtree":{"commit":"abc"}}')
                subprocess.run(['bash', '-e', '-c', outcome], cwd=repo, env=env, check=True, capture_output=True)
                self.assertIn(f'status={expected}', Path(env['GITHUB_OUTPUT']).read_text())

    def test_failed_outcome_fails_job(self):
        script = run_block('Fail job on sync failure').replace('${{ steps.outcome.outputs.status }}', 'failed')
        result = subprocess.run(['bash', '-e', '-c', script], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b'::error::', result.stdout)
        workflow = WORKFLOW.read_text()
        sync_step = workflow.split('      - name: Run subtree sync\n', 1)[1].split('      - name:', 1)[0]
        self.assertIn("SUBTREE_STRICT_EXIT: '1'", sync_step)
        self.assertIn("if: always() && needs.sync.outputs.status == 'failed'", workflow)

    def test_non_user_errors_remain_failures(self):
        for strict in ['0', '1']:
            result = subprocess.run(['bash', '-c', 'source "$1"; clean_exit 7 "failure"', '_', str(HELPER)],
                                    env=dict(os.environ, SUBTREE_STRICT_EXIT=strict, npm_config_user_agent='pnpm'),
                                    capture_output=True)
            self.assertEqual(result.returncode, 7)


if __name__ == '__main__':
    unittest.main()
