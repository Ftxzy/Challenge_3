import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

const authorSelect = { select: { id: true, name: true, email: true } };

export const createComment = async (req: Request, res: Response) => {
  const { content, postId, authorId } = req.body ?? {};

  if (!content || !postId || !authorId) {
    throw new HttpError(400, "Content, postId, dan authorId wajib diisi");
  }

  const post = await prisma.post.findUnique({ where: { id: parseId(postId) } });
  if (!post) throw new HttpError(404, "Post tidak ditemukan");

  const author = await prisma.user.findUnique({ where: { id: parseId(authorId) } });
  if (!author) throw new HttpError(404, "User tidak ditemukan");

  const comment = await prisma.comment.create({
    data: { content, postId: post.id, authorId: author.id },
    include: { author: authorSelect },
  });

  sendSuccess(res, 201, "Comment berhasil dibuat", comment);
};

export const getAllComments = async (_req: Request, res: Response) => {
  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: authorSelect },
  });

  sendSuccess(res, 200, "Berhasil mengambil data comments", comments);
};

export const getCommentById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { author: authorSelect },
  });
  if (!comment) throw new HttpError(404, "Comment tidak ditemukan");

  sendSuccess(res, 200, "Berhasil mengambil data comment", comment);
};

export const updateComment = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const { content } = req.body ?? {};

  if (!content) throw new HttpError(400, "Content wajib diisi");

  // Jika id tidak ada, Prisma melempar error P2025 -> ditangani errorHandler (404)
  const comment = await prisma.comment.update({
    where: { id },
    data: { content },
    include: { author: authorSelect },
  });

  sendSuccess(res, 200, "Comment berhasil diupdate", comment);
};

export const deleteComment = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  await prisma.comment.delete({ where: { id } });

  sendSuccess(res, 200, "Comment berhasil dihapus");
};
