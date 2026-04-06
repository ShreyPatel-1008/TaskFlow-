const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const {
    getNotes,
    createNote,
    updateNote,
    togglePin,
    deleteNote
} = require('../controllers/noteController');

// NOTE: `auth` and `attachWorkspace` are applied at the router level
// in server.js.

// Read — viewers can see notes
router.get('/',          requireRole('viewer'), getNotes);

// Write — members can create/edit/delete notes
router.post('/',         requireRole('member'), createNote);
router.put('/:id',       requireRole('member'), updateNote);
router.patch('/:id/pin', requireRole('member'), togglePin);
router.delete('/:id',    requireRole('member'), deleteNote);

module.exports = router;
