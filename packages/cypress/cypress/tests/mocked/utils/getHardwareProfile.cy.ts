import { getHardwareProfile } from '../../../utils/oc_commands/hardwareProfiles';

describe('getHardwareProfile', () => {
  it('requests the profile as JSON and fails on a non-zero exit', () => {
    cy.stub(cy, 'exec').callsFake((command: string, options: { failOnNonZeroExit: boolean }) => {
      expect(command).to.contain('oc get hardwareprofiles x');
      expect(command).to.contain('-o json');
      expect(options).to.deep.eq({ failOnNonZeroExit: true });
      return cy.wrap({ stdout: '{"kind":"HardwareProfile"}', stderr: '', exitCode: 0 });
    });

    getHardwareProfile('x').then((result) => {
      expect(result.exitCode).to.equal(0);
      expect(JSON.parse(result.stdout)).to.deep.eq({ kind: 'HardwareProfile' });
    });
  });

  it('allows a missing profile and surfaces NotFound to the caller', () => {
    cy.stub(cy, 'exec').callsFake((command: string, options: { failOnNonZeroExit: boolean }) => {
      expect(command).to.contain('oc get hardwareprofiles x');
      expect(command).to.contain('-o json');
      expect(options).to.deep.eq({ failOnNonZeroExit: false });
      return cy.wrap({
        stdout: '',
        stderr: 'Error from server (NotFound): hardwareprofiles "x" not found',
        exitCode: 1,
      });
    });

    getHardwareProfile('x', { allowNotFound: true }).then((result) => {
      expect(result.exitCode).to.not.equal(0);
      expect(result.stderr).to.contain('NotFound');
    });
  });
});
