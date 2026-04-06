import React, { useState, useRef, useEffect } from 'react';
import API from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { Upload, FileText, Image, File, Trash2, Download, Paperclip } from 'lucide-react';

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (mimeType) => {
  if (mimeType?.startsWith('image/')) return Image;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return FileText;
  return File;
};

const AttachmentsSection = ({ taskId, canDelete = false }) => {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!taskId) return;
    fetchAttachments();
  }, [taskId]);

  const fetchAttachments = async () => {
    try {
      const res = await API.get(`/tasks/${taskId}/attachments`);
      setAttachments(res.data);
    } catch (err) {
      console.error('Failed to fetch attachments:', err);
    }
  };

  const handleUpload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        await API.post(`/tasks/${taskId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
          }
        });
      } catch (err) {
        console.error('Upload failed:', err);
        alert(err.response?.data?.message || 'Upload failed');
      }
    }

    setUploading(false);
    setUploadProgress(0);
    fetchAttachments();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await API.delete(`/tasks/${taskId}/attachments/${id}`);
      setAttachments(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const isImage = (mimeType) => mimeType?.startsWith('image/');

  return (
    <div className="pf-section">
      <div className="pf-section-header">
        <Paperclip size={14} /> Attachments
        {attachments.length > 0 && (
          <span className="pf-badge">{attachments.length}</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`pf-dropzone${dragOver ? ' active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={20} />
        <span>{uploading ? `Uploading... ${uploadProgress}%` : 'Drop files here or click to browse'}</span>
        {uploading && (
          <div className="pf-progress">
            <div className="pf-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={(e) => handleUpload(Array.from(e.target.files))}
        />
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="pf-attachments-list">
          {attachments.map(att => {
            const Icon = getFileIcon(att.mimeType);
            const uploaderName = att.uploadedBy?.name || 'Unknown';
            let timeStr = '';
            try { timeStr = formatDistanceToNow(new Date(att.createdAt), { addSuffix: true }); } catch (e) {}

            return (
              <div key={att._id} className="pf-attachment-item">
                <div className="pf-attachment-preview">
                  {isImage(att.mimeType) ? (
                    <img src={att.url} alt={att.filename} />
                  ) : (
                    <Icon size={24} />
                  )}
                </div>
                <div className="pf-attachment-info">
                  <div className="pf-attachment-name">{att.filename}</div>
                  <div className="pf-attachment-meta">
                    {formatFileSize(att.size)} · {uploaderName} · {timeStr}
                  </div>
                </div>
                <div className="pf-attachment-actions">
                  <a href={att.url} download={att.filename} className="pf-att-btn" title="Download">
                    <Download size={14} />
                  </a>
                  {canDelete && (
                    <button className="pf-att-btn danger" onClick={() => handleDelete(att._id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttachmentsSection;
