const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Attachment = require('../models/Attachment');
const Task = require('../models/Task');
const requireRole = require('../middleware/requireRole');
const { logActivity } = require('../services/activity');

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENTS_PER_TASK = 20;

// --- Storage strategy ---
const STORAGE_STRATEGY = process.env.STORAGE_STRATEGY || 'local';

let upload;

if (STORAGE_STRATEGY === 'cloudinary') {
  // Cloudinary strategy
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'taskflow',
      allowed_formats: ['jpg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'],
      resource_type: 'auto',
      public_id: () => uuidv4()
    }
  });

  upload = multer({
    storage: cloudStorage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
      else cb(new Error('File type not allowed'), false);
    }
  });
} else {
  // Local storage strategy
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const localStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  });

  upload = multer({
    storage: localStorage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
      else cb(new Error('File type not allowed'), false);
    }
  });
}

// POST /api/tasks/:taskId/attachments
router.post('/', requireRole('member'), upload.single('file'), async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verify task exists
    const task = await Task.findOne({ _id: taskId, workspaceId: req.workspaceId });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Check attachment limit
    const existingCount = await Attachment.countDocuments({ taskId });
    if (existingCount >= MAX_ATTACHMENTS_PER_TASK) {
      return res.status(400).json({ message: `Maximum ${MAX_ATTACHMENTS_PER_TASK} attachments per task` });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let url, storedFilename;
    if (STORAGE_STRATEGY === 'cloudinary') {
      url = req.file.path; // Cloudinary URL
      storedFilename = req.file.filename;
    } else {
      storedFilename = req.file.filename;
      url = `/uploads/${storedFilename}`;
    }

    const attachment = await Attachment.create({
      taskId,
      workspaceId: req.workspaceId,
      uploadedBy: req.user._id,
      filename: req.file.originalname,
      storedFilename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url
    });

    const populated = await Attachment.findById(attachment._id)
      .populate('uploadedBy', '_id name avatar');

    logActivity(
      req.workspaceId, req.user._id, 'task_created',
      `${req.user.name} uploaded '${req.file.originalname}' to '${task.title}'`,
      `/tasks?id=${taskId}`,
      { taskId, attachmentId: attachment._id }
    );

    res.status(201).json(populated);
  } catch (err) {
    if (err.message === 'File type not allowed') {
      return res.status(400).json({ message: err.message });
    }
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// GET /api/tasks/:taskId/attachments
router.get('/', requireRole('viewer'), async (req, res) => {
  try {
    const attachments = await Attachment.find({ taskId: req.params.taskId })
      .populate('uploadedBy', '_id name avatar')
      .sort({ createdAt: -1 });
    res.json(attachments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/attachments/:id
router.delete('/:id', async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Only uploader or admin can delete
    const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.workspaceRole === 'admin';
    if (!isUploader && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this attachment' });
    }

    // Delete from storage
    if (STORAGE_STRATEGY === 'cloudinary') {
      try {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(attachment.storedFilename);
      } catch (e) {
        console.error('Cloudinary delete error:', e.message);
      }
    } else {
      const filePath = path.join(__dirname, '..', 'uploads', attachment.storedFilename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Attachment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
