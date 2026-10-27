import { Router } from "express";
import {
  createBulkPosts,
  createPost,
  deletePost,
  getAllPosts,
  getDailyPostStats,
  getPostById,
  getPostStats,
  updatePost,
} from "../controllers/postController";

const router = Router();

// 059 : mendaftarkan route POST /api/posts/bulk untuk bulk create post
router.post("/bulk", createBulkPosts);
router.post("/", createPost);
router.get("/", getAllPosts);
// 059 : mendaftarkan route GET /api/posts/stats/daily sebelum route dinamis /:id
router.get("/stats/daily", getDailyPostStats);
router.get("/stats", getPostStats); // HARUS di atas "/:id", kalau tidak "stats" dianggap sebagai id
router.get("/:id", getPostById);
router.patch("/:id", updatePost);
router.delete("/:id", deletePost);

export default router;
