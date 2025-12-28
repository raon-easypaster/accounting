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
    init: (clientId, apiKey) => {
        if (gapiInited && gisInited && currentClientId === clientId && tokenClient) {
            return Promise.resolve();
        }

        if (initPromise && currentClientId === clientId) {
            return initPromise;
        }

        console.log('GoogleDriveUtils.init starting...');
        currentClientId = clientId;

        initPromise = new Promise((resolve, reject) => {
            // Safety timeout (30 seconds)
            const timeout = setTimeout(() => {
                reject('Google Drive initialization timed out');
                initPromise = null;
            }, 30000);

            const loadGapi = () => {
                return new Promise((res) => {
                    if (window.gapi) return res();
                    const script = document.createElement('script');
                    script.src = 'https://apis.google.com/js/api.js';
                    script.async = true;
                    script.defer = true;
                    script.onload = () => res();
                    script.onerror = () => reject('Failed to load GAPI script');
                    document.body.appendChild(script);
                });
            };

            const loadGis = () => {
                return new Promise((res) => {
                    if (window.google?.accounts?.oauth2) return res();
                    const script = document.createElement('script');
                    script.src = 'https://accounts.google.com/gsi/client';
                    script.async = true;
                    script.defer = true;
                    script.onload = () => res();
                    script.onerror = () => reject('Failed to load GIS script');
                    document.body.appendChild(script);
                });
            };

            Promise.all([loadGapi(), loadGis()]).then(async () => {
                console.log('Scripts loaded, initializing client...');

                // Init GIS tokenClient
                try {
                    if (!tokenClient || currentClientId !== clientId) {
                        tokenClient = window.google.accounts.oauth2.initTokenClient({
                            client_id: clientId,
                            scope: SCOPES,
                            callback: '', // defined at request time
                        });
                        gisInited = true;
                        console.log('GIS tokenClient initialized');
                    }
                } catch (e) {
                    console.error('GIS init failed', e);
                    return reject(e);
                }

                // Init GAPI client
                window.gapi.load('client', async () => {
                    try {
                        await window.gapi.client.init({
                            apiKey: apiKey,
                            discoveryDocs: [DISCOVERY_DOC],
                        });
                        gapiInited = true;
                        console.log('GAPI client initialized');
                        clearTimeout(timeout);
                        resolve();
                        initPromise = null;
                    } catch (err) {
                        console.error('GAPI init failed', err);
                        clearTimeout(timeout);
                        reject(err);
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

            if (window.gapi.client.getToken() === null) {
                console.log('Requesting new access token (prompt: consent)...');
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                console.log('Refreshing access token (prompt: "")...');
                tokenClient.requestAccessToken({ prompt: '' });
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
