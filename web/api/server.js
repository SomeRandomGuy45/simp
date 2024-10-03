const express = require('express');
const { json } = require('express');
const expressWs = require('express-ws');
const { serve, setup } = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const multer = require('multer');
const { diskStorage } = require('multer');
const { join } = require('path');
const { existsSync } = require('fs');

const app = express();
expressWs(app);

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
    res.json({success : true});
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
app.post('/api/uploadData', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded or invalid file type. Only .zip files are allowed.');
    }
    res.send(`File uploaded successfully: ${req.file.filename}`);
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