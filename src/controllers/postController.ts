import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

const authorSelect = { select: { id: true, name: true, email: true } };

export const createPost = async (req: Request, res: Response) => {
  const { title, content, authorId } = req.body ?? {};

  if (!title || !authorId) {
    throw new HttpError(400, "Title dan authorId wajib diisi");
  }

  const author = await prisma.user.findUnique({
    where: { id: parseId(authorId) },
  });
  if (!author) throw new HttpError(404, "User tidak ditemukan");

  const post = await prisma.post.create({
    data: { title, content, authorId: author.id },
    include: { author: authorSelect },
  });

  sendSuccess(res, 201, "Post berhasil dibuat", post);
};

// 059 : handler controller untuk membuat banyak post sekaligus dalam satu operasi (Challenge No. 4)
export const createBulkPosts = async (req: Request, res: Response) => {
  // 059 : mengambil data post dari req.body, mendukung format array langsung maupun object { posts: [...] }
  const rawPosts = Array.isArray(req.body) ? req.body : req.body?.posts;

  // 059 : memvalidasi bahwa input yang dikirim harus berbentuk array dan tidak boleh kosong
  if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
    throw new HttpError(400, "Request body harus berupa array post dan tidak boleh kosong");
  }

  // 059 : melakukan mapping dan validasi untuk setiap data post di dalam array
  const postsData = rawPosts.map((item: any, index: number) => {
    // 059 : memvalidasi keberadaan field wajib title dan authorId pada setiap elemen
    if (!item.title || !item.authorId) {
      throw new HttpError(400, `Data post pada indeks ${index} tidak valid (title dan authorId wajib diisi)`);
    }

    // 059 : menyusun data post yang sudah dinormalisasi tipe datanya
    return {
      title: String(item.title),
      content: item.content !== undefined ? String(item.content) : null,
      published: typeof item.published === "boolean" ? item.published : false,
      authorId: parseId(item.authorId),
    };
  });

  // 059 : mengumpulkan daftar ID author yang unik untuk memvalidasi keberadaan relasi User
  const uniqueAuthorIds = [...new Set(postsData.map((p) => p.authorId))];
  const existingUsers = await prisma.user.findMany({
    where: { id: { in: uniqueAuthorIds } },
    select: { id: true },
  });
  const existingUserIds = new Set(existingUsers.map((u) => u.id));

  // 059 : memeriksa apakah seluruh authorId yang dicantumkan terdaftar di database
  for (const authorId of uniqueAuthorIds) {
    if (!existingUserIds.has(authorId)) {
      throw new HttpError(404, `User dengan ID ${authorId} tidak ditemukan`);
    }
  }

  // 059 : menyimpan banyak baris data post sekaligus ke database PostgreSQL menggunakan method createMany
  const result = await prisma.post.createMany({
    data: postsData,
  });

  // 059 : mengirim response sukses berstatus 201 Created dengan informasi total data yang berhasil disimpan
  sendSuccess(res, 201, `${result.count} post berhasil dibuat secara massal`, result);
};

// GET /api/posts?page=1&limit=5&search=eco&published=true
export const getAllPosts = async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const published =
    req.query.published === undefined
      ? undefined
      : req.query.published === "true";

  const where = {
    ...(search && { title: { contains: search, mode: "insensitive" as const } }),
    ...(published !== undefined && { published }),
  };

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { author: authorSelect },
    }),
    prisma.post.count({ where }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil data posts", posts, {
    currentPage: page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit),
  });
};

// 059 : handler controller untuk mengambil statistik jumlah post per hari menggunakan raw query (Challenge No. 3)
export const getDailyPostStats = async (_req: Request, res: Response) => {
  // 059 : mengeksekusi raw query SQL dengan date_trunc('day', ...) untuk mengelompokkan data berdasarkan tanggal
  // 059 : COUNT(*)::int digunakan untuk mengubah hasil agregasi menjadi integer agar tidak terkena error serialisasi BigInt di JSON
  const daily = await prisma.$queryRaw<{ day: Date; total: number }[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS total
    FROM "Post"
    GROUP BY day
    ORDER BY day ASC
  `;

  // 059 : mengirimkan data statistik harian kepada client dengan status 200 OK
  sendSuccess(res, 200, "Berhasil mengambil statistik posts per hari", daily);
};

export const getPostStats = async (_req: Request, res: Response) => {
  const [overall, perAuthor] = await Promise.all([
    prisma.post.aggregate({
      _count: { id: true },
      _sum: { views: true },
      _avg: { views: true },
      _max: { views: true },
    }),
    prisma.post.groupBy({
      by: ["authorId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil statistik posts", {
    overall,
    perAuthor,
  });
};

export const getPostById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  const post = await prisma.post.findUnique({
    where: { id },
    include: { author: authorSelect },
  });
  if (!post) throw new HttpError(404, "Post tidak ditemukan");

  sendSuccess(res, 200, "Berhasil mengambil data post", post);
};

export const updatePost = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const { title, content, published } = req.body ?? {};

  const post = await prisma.post.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(content !== undefined && { content }),
      ...(published !== undefined && { published }),
    },
    include: { author: authorSelect },
  });

  sendSuccess(res, 200, "Post berhasil diupdate", post);
};

export const deletePost = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  await prisma.post.delete({ where: { id } });

  sendSuccess(res, 200, "Post berhasil dihapus");
};
