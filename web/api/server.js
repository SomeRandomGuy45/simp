const express = require('express');
const { json } = require('express');
const expressWs = require('express-ws');
const { serve, setup } = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const multer = require('multer');
const { diskStorage } = require('multer');
const { join } = require('path');
const { existsSync } = require('fs');
const { createReadStream, createWriteStream, promises: fsPromises } = require('fs');
const unzipper = require('unzipper');
const archiver = require('archiver'); // Import archiver
const { basename } = require('path');

const app = express();
expressWs(app);

async function removeDirectory(path) {
    try {
        await fsPromises.rm(path, { recursive: true, force: true });
        console.log(`Removed directory: ${path}`);
    } catch (error) {
        console.error(`Failed to remove directory ${path}:`, error);
    }
}

// Set up multer for handling file uploads
const storage = diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Save with the original filename
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Allow .zip files
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
            cb(null, true);
        } else {
            cb(new Error('Only .zip files are allowed!'), false);
        }
    }
});

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'simp API',
        version: '1.0.0',
        description: 'simp API documentation',
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Local server',
        },
    ],
};

// Options for the swagger docs
const options = {
    swaggerDefinition,
    apis: ['./server.js'], // Path to the API docs in comments
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

app.use(json());

// Serve the Swagger API documentation dynamically
app.use('/docs', serve, setup(swaggerSpec));

app.get('/', (req, res) => {
    res.json({ success: true });
});

/**
 * @swagger
 * /api/uploadData:
 *   post:
 *     summary: Upload a zip file which would be used for SIMP modules
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file type or no file provided
 */
app.post('/api/uploadData', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded or invalid file type. Only .zip files are allowed.');
    }

    const filePath = join(__dirname, 'uploads', req.file.filename);
    const extractedPath = join(__dirname, 'uploads', basename(req.file.filename, '.zip'));

    try {
        // Unzip the file
        await new Promise((resolve, reject) => {
            createReadStream(filePath)
                .pipe(unzipper.Extract({ path: extractedPath }))
                .on('close', resolve)
                .on('error', reject);
        });

        // Check if the "Users" folder exists and remove it
        const userFolderPath = join(extractedPath, 'Users');
        if (existsSync(userFolderPath)) {
            await removeDirectory(userFolderPath);
        }

        // Remove the original ZIP file after extraction
        await removeDirectory(filePath); // Ensure this is awaited

        // Re-zip the directory
        const zipFilePath = join(__dirname, 'uploads', req.file.filename); // Adjust the path if needed
        const output = createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Set the compression level
        });

        // Set up the event listeners
        output.on('close', () => {
            console.log(`${archive.pointer()} total bytes`);
            console.log('Zip file has been created successfully.');
            // Send response after the ZIP file is fully created
            res.send(`File uploaded, processed, and re-zipped successfully: ${zipFilePath}`);
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);
        archive.directory(extractedPath + '/', false); // Add the directory to the archive

        // Finalize the archive
        await archive.finalize(); // Make sure to await this too
        removeDirectory(extractedPath);

    } catch (error) {
        console.error('Error processing the zip file:', error);
        res.status(500).send('Error processing the zip file.');
    }
});


/**
 * @swagger
 * /api/getZipFiles:
 *   post:
 *     summary: Get zip files based on names provided in the request body
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filenames:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Files found and ready for download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: One or more files not found
 */
app.post('/api/getZipFiles', (req, res) => {
    const { filenames } = req.body;

    if (!Array.isArray(filenames) || filenames.length === 0) {
        return res.status(400).send('Invalid request: Please provide an array of filenames.');
    }

    const filesToSend = [];

    filenames.forEach((filename) => {
        const filePath = join(__dirname, 'uploads', filename);

        if (existsSync(filePath)) {
            filesToSend.push({
                name: filename,
                path: `/api/download/${filename}` // Provide the download link
            });
        }
    });

    if (filesToSend.length > 0) {
        res.status(200).json({ files: filesToSend });
    } else {
        res.status(404).send('None of the requested files were found.');
    }
});

/**
 * @swagger
 * /api/getZipFiles/{name}:
 *   get:
 *     summary: Get a zip file by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the zip file to retrieve
 *     responses:
 *       200:
 *         description: File found and ready for download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 file:
 *                   type: string
 *                   description: The download link for the zip file
 *       404:
 *         description: File not found
 */
app.get('/api/getZipFiles/:name', (req, res) => {
    const fileName = req.params.name;
    const filePath = join(__dirname, 'uploads', fileName);

    if (existsSync(filePath)) {
        res.status(200).json({ file: `/api/download/${fileName}` }); // Provide the download link
    } else {
        res.status(404).send('File not found.');
    }
});

/**
 * @swagger
 * /api/download/{filename}:
 *   get:
 *     summary: Download a zip file
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the file to download
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 */
app.get('/api/download/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = join(__dirname, 'uploads', fileName);

    if (existsSync(filePath)) {
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Error downloading the file:', err);
                res.status(500).send('Error downloading the file.');
            }
        });
    } else {
        res.status(404).send('File not found.');
    }
});

app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});