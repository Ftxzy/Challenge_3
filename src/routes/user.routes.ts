import { Router } from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  getUserPosts,
  updateUser,
} from "../controllers/userController";

const router = Router();

router.post("/", createUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.get("/:id/posts", getUserPosts);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
