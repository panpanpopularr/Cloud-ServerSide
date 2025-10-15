// File: api/src/routes/user.routes.js

import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Middleware สำหรับตรวจสอบว่าผู้ใช้ล็อคอินแล้วหรือยัง
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// === GET /api/user/profile: สำหรับดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน ===
router.get('/user/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// === PUT /api/user/profile: สำหรับอัปเดตข้อมูลโปรไฟล์ ===
router.put('/user/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email, phone },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
    
  } catch (error) { // ✅ ===== จุดที่แก้ไขแล้ว (เพิ่มปีกกา) ===== ✅
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;