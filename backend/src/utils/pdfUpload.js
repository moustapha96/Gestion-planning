const path = require('path');
const multer = require('multer');

const PDF_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf']);

/**
 * Filtre multer : extension .pdf et type MIME PDF (ou octet-stream).
 */
function pdfOnlyMulterFileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.pdf') {
        return cb(new Error('Seuls les fichiers PDF (.pdf) sont acceptés.'));
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (!mime || mime === 'application/octet-stream') {
        return cb(null, true);
    }
    if (PDF_MIME_TYPES.has(mime)) {
        return cb(null, true);
    }
    return cb(new Error('Le fichier doit être un document PDF (type MIME invalide).'));
}

/**
 * Middleware : exécute un handler multer (ex. upload.single('file')) et renvoie du JSON en cas d'erreur.
 */
function wrapMulterUpload(multerMiddleware) {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (!err) return next();
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Fichier trop volumineux.' });
                }
                return res.status(400).json({ error: err.message || 'Fichier invalide.' });
            }
            return res.status(400).json({ error: err.message || 'Erreur lors de l\'envoi du fichier.' });
        });
    };
}

module.exports = {
    pdfOnlyMulterFileFilter,
    wrapMulterUpload,
    PDF_MIME_TYPES,
};
