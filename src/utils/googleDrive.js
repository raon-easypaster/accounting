const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DATA_FILENAME = 'raon_church_ledger_data.json';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const GoogleDriveUtils = {
    // Initialize GAPI and GIS
    init: (clientId, apiKey) => {
        return new Promise((resolve, reject) => {
            const script1 = document.createElement('script');
            script1.src = 'https://apis.google.com/js/api.js';
            script1.async = true;
            script1.defer = true;
            script1.onload = () => {
                window.gapi.load('client', async () => {
                    try {
                        await window.gapi.client.init({
                            apiKey: apiKey,
                            discoveryDocs: [DISCOVERY_DOC],
                        });
                        gapiInited = true;
                        if (gisInited) resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
            };
            document.body.appendChild(script1);

            const script2 = document.createElement('script');
            script2.src = 'https://accounts.google.com/gsi/client';
            script2.async = true;
            script2.defer = true;
            script2.onload = () => {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    callback: '', // defined at request time
                });
                gisInited = true;
                if (gapiInited) resolve();
            };
            document.body.appendChild(script2);
        });
    },

    // Authenticate User
    signIn: () => {
        return new Promise((resolve, reject) => {
            if (!tokenClient) return reject('Google Drive not initialized');

            tokenClient.callback = async (resp) => {
                if (resp.error) {
                    reject(resp);
                }
                resolve(resp);
            };

            if (window.gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    },

    // Sign Out
    signOut: () => {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            window.gapi.client.setToken('');
        }
    },

    // Search for existing data file
    findFile: async () => {
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${DATA_FILENAME}' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });
        const files = response.result.files;
        return files && files.length > 0 ? files[0] : null;
    },

    // Load data from file
    loadFile: async (fileId) => {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return response.result; // Should be the JSON content
    },

    // Create or Update file
    saveFile: async (content) => {
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
