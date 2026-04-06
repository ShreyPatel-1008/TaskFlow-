const Note = require('../models/Note');

// Get all notes
exports.getNotes = async (req, res) => {
    try {
        const notes = await Note.find({ workspaceId: req.workspaceId })
            .sort({ isPinned: -1, updatedAt: -1 });
        res.json({ notes });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Create note
exports.createNote = async (req, res) => {
    try {
        const { title, content, color } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Note content is required' });
        }

        const note = await Note.create({
            title: title || '',
            content,
            color: color || 'yellow',
            userId: req.userId,
            workspaceId: req.workspaceId
        });

        res.status(201).json({ note });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Update note
exports.updateNote = async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, workspaceId: req.workspaceId });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const allowedUpdates = ['title', 'content', 'color', 'isPinned'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                note[field] = req.body[field];
            }
        });

        await note.save();
        res.json({ note });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Toggle pin
exports.togglePin = async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, workspaceId: req.workspaceId });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        note.isPinned = !note.isPinned;
        await note.save();
        res.json({ note });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete note
exports.deleteNote = async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, workspaceId: req.workspaceId });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
