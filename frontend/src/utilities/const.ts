const DEV_MODE = process.env.APP_ENV === 'development';
const API_PORT = process.env.BACKEND_PORT || 8080;
const POLL_INTERVAL = process.env.POLL_INTERVAL ? parseInt(process.env.POLL_INTERVAL) : 30000;
const DOC_LINK = process.env.DOC_LINK;
const COMMUNITY_LINK = process.env.COMMUNITY_LINK;
const SUPPORT_LINK = process.env.SUPPORT_LINK;

export { DEV_MODE, API_PORT, POLL_INTERVAL, DOC_LINK, COMMUNITY_LINK, SUPPORT_LINK };
