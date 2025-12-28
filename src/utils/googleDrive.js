const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DATA_FILENAME = 'raon_church_ledger_data.json';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let initPromise = null;
let currentClientId = null;

export const GoogleDriveUtils = {
    // Initialize GAPI and GIS
    init: (clientId) => {
        if (gapiInited && gisInited && currentClientId === clientId && tokenClient) {
            return Promise.resolve();
        }

        if (initPromise && currentClientId === clientId) {
            return initPromise;
        }

        console.log('GoogleDriveUtils.init starting...');
        currentClientId = clientId;

        initPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const msg = '구글 보안 라이브러리를 불러오는 데 실패했습니다 (Timeout). 인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.';
                console.error(msg);
                reject(msg);
                initPromise = null;
            }, 15000); // Reduce timeout to 15s for better UX

            const injectScript = (src, id) => {
                return new Promise((res) => {
                    if (document.getElementById(id)) return res();
                    const script = document.createElement('script');
                    script.src = src;
                    script.id = id;
                    script.async = true;
                    script.defer = true;
                    script.onload = () => res();
                    script.onerror = () => reject(`Failed to load script: ${src}`);
                    document.body.appendChild(script);
                });
            };

            Promise.all([
                injectScript('https://apis.google.com/js/api.js', 'gapi-js'),
                injectScript('https://accounts.google.com/gsi/client', 'gis-js')
            ]).then(async () => {
                console.log('Scripts injected, checking readiness...');

                // 1. GIS Init (Independent of GAPI)
                try {
                    if (!tokenClient || currentClientId !== clientId) {
                        tokenClient = window.google.accounts.oauth2.initTokenClient({
                            client_id: clientId,
                            scope: SCOPES,
                            callback: '', // defined at request time
                        });
                        gisInited = true;
                        console.log('GIS tokenClient ready');
                    }
                } catch (e) {
                    console.error('GIS init failed', e);
                    return reject('GIS 초기화 실패: ' + e.message);
                }

                // 2. GAPI Load Library
                window.gapi.load('client', {
                    callback: async () => {
                        try {
                            // Using load() instead of init({apiKey, discoveryDocs}) for better reliability
                            await window.gapi.client.load('drive', 'v3');
                            gapiInited = true;
                            console.log('GAPI drive library ready');
                            clearTimeout(timeout);
                            resolve();
                            initPromise = null;
                        } catch (err) {
                            console.error('GAPI load failed', err);
                            clearTimeout(timeout);
                            reject('GAPI 라이브러리 로드 실패');
                            initPromise = null;
                        }
                    },
                    onerror: () => {
                        clearTimeout(timeout);
                        reject('GAPI 로딩 오류');
                        initPromise = null;
                    },
                    timeout: 5000,
                    ontimeout: () => {
                        clearTimeout(timeout);
                        reject('GAPI 로딩 시간 초과');
                        initPromise = null;
                    }
                });
            }).catch(err => {
                clearTimeout(timeout);
                reject(err);
                initPromise = null;
            });
        });

        return initPromise;
    },

    // Check if currently connected
    isConnected: () => {
        try {
            const token = window.gapi?.client?.getToken();
            return !!(token && token.access_token);
        } catch (e) {
            return false;
        }
    },

    // Authenticate User
    signIn: () => {
        console.log('GoogleDriveUtils.signIn starting...');
        return new Promise((resolve, reject) => {
            if (!tokenClient) {
                console.error('tokenClient not initialized');
                return reject('Google Drive not initialized');
            }

            // Check if we already have a token
            const existingToken = window.gapi.client.getToken();
            if (existingToken && existingToken.access_token) {
                console.log('Already have valid token');
                return resolve(existingToken);
            }

            tokenClient.callback = async (resp) => {
                console.log('GoogleDriveUtils.signIn callback received:', resp);
                if (resp.error) {
                    console.error('Sign-in error:', resp.error);
                    reject(resp);
                } else {
                    // Critical: set the token in GAPI client
                    window.gapi.client.setToken(resp);
                    console.log('GAPI token set successfully');
                    resolve(resp);
                }
            };

            // Use prompt: 'select_account' to force account picker (better UX)
            console.log('Requesting access token with account selection...');
            try {
                tokenClient.requestAccessToken({
                    prompt: 'select_account',
                    // Hint to use redirect if popup fails
                    ux_mode: 'redirect',
                    redirect_uri: window.location.origin
                });
            } catch (e) {
                console.error('requestAccessToken failed:', e);
                reject(e);
            }
        });
    },

    // Sign Out
    signOut: () => {
        console.log('GoogleDriveUtils.signOut starting...');
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            window.gapi.client.setToken(null);
            console.log('Token revoked and cleared');
        }
    },

    // Search for existing data file
    findFile: async () => {
        console.log('GoogleDriveUtils.findFile searching for:', DATA_FILENAME);
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${DATA_FILENAME}' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });
        const files = response.result.files;
        console.log('Search results:', files);
        return files && files.length > 0 ? files[0] : null;
    },

    // Load data from file
    loadFile: async (fileId) => {
        console.log('GoogleDriveUtils.loadFile with id:', fileId);
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return response.result;
    },

    // Create or Update file
    saveFile: async (content) => {
        console.log('GoogleDriveUtils.saveFile starting...');
        try {
            const file = await GoogleDriveUtils.findFile();
            const fileContent = JSON.stringify(content, null, 2);
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const fileMetadata = {
                name: DATA_FILENAME,
                mimeType: 'application/json',
                description: `Last updated: ${new Date().toLocaleString()}`
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(fileMetadata) +
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                fileContent +
                close_delim;

            let response;
            if (file) {
                console.log('Updating existing file:', file.id);
                // Update existing file using multipart
                response = await window.gapi.client.request({
                    path: `/upload/drive/v3/files/${file.id}`,
                    method: 'PATCH',
                    params: { uploadType: 'multipart' },
                    headers: {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    body: multipartRequestBody
                });
            } else {
                console.log('Creating new file...');
                // Create new file using multipart
                response = await window.gapi.client.request({
                    path: '/upload/drive/v3/files',
                    method: 'POST',
                    params: { uploadType: 'multipart' },
                    headers: {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    body: multipartRequestBody
                });
            }

            console.log('Save response status:', response.status);
            if (response.status !== 200) {
                throw new Error(`Google Drive API Error: ${response.status} ${response.statusText}`);
            }
            return response.result;
        } catch (error) {
            console.error('GoogleDriveUtils.saveFile Error:', error);
            throw error;
        }
    }
};
