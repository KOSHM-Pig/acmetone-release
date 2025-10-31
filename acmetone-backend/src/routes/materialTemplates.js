const express = require('express');
const router = express.Router();
const { adminAuth, auth } = require('../middleware/auth');
const {
  createMaterialTemplate,
  getAllMaterialTemplates,
  updateMaterialTemplate,
  deleteMaterialTemplate,
  uploadImageBase64,
} = require('../controllers/materialTemplateController');

router.get('/', auth, getAllMaterialTemplates);
router.post('/', adminAuth, createMaterialTemplate);

router.post('/upload', adminAuth, uploadImageBase64);

router.put('/:id', adminAuth, updateMaterialTemplate);
router.delete('/:id', adminAuth, deleteMaterialTemplate);

module.exports = router; 