import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/src/lib/supabaseServiceRoleClient";
import { logError, logInfo } from "@/src/lib/logging/log.util";
import { prisma } from "@/src/server/db/prisma";
import { getBoardAttachmentSettingsForTenant } from "@/src/lib/boardAttachmentSettings";

interface BoardAttachmentUploadResponseItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      logError("board.attachments.api.auth_error", {
        reason: authError?.message ?? "no_session",
      });
      return NextResponse.json({ errorCode: "auth_error" }, { status: 401 });
    }

    const formData = await req.formData();

    const postIdValue = formData.get("postId");
    const postId = typeof postIdValue === "string" ? postIdValue : null;

    if (!postId) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    const {
      data: appUser,
      error: appUserError,
    } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (appUserError || !appUser) {
      logError("board.attachments.api.user_not_found", {
        email: user.email,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const post = await prisma.board_posts.findFirst({
      where: {
        id: postId,
      },
      select: {
        id: true,
        tenant_id: true,
        author_id: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json({ errorCode: "post_not_found" }, { status: 404 });
    }

    if (post.status !== "published") {
      return NextResponse.json({ errorCode: "forbidden" }, { status: 403 });
    }

    const tenantId = post.tenant_id as string;

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", appUser.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (membershipError || !membership?.tenant_id) {
      logError("board.attachments.api.membership_error", {
        userId: appUser.id,
      });
      return NextResponse.json({ errorCode: "unauthorized" }, { status: 403 });
    }

    const isAuthor = post.author_id === appUser.id;

    let hasAdminRole = false;
    try {
      const {
        data: userRoles,
        error: userRolesError,
      } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", appUser.id)
        .eq("tenant_id", tenantId);

      if (!userRolesError && userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
        const roleIds = userRoles
          .map((row: any) => row.role_id)
          .filter((id: unknown): id is string => typeof id === "string");

        if (roleIds.length > 0) {
          const {
            data: roles,
            error: rolesError,
          } = await supabase
            .from("roles")
            .select("id, role_key")
            .in("id", roleIds as string[]);

          if (!rolesError && roles && Array.isArray(roles)) {
            hasAdminRole = roles.some(
              (role: any) =>
                role.role_key === "tenant_admin" || role.role_key === "system_admin",
            );
          }
        }
      }
    } catch {
      hasAdminRole = false;
    }

    if (!isAuthor && !hasAdminRole) {
      return NextResponse.json({ errorCode: "forbidden" }, { status: 403 });
    }

    const existingAttachments = await prisma.board_attachments.findMany({
      where: {
        tenant_id: tenantId,
        post_id: postId,
      },
      select: {
        id: true,
      },
    });

    const attachmentSettings = getBoardAttachmentSettingsForTenant(tenantId);

    const rawFiles = formData.getAll("attachments");
    const uploadFiles = rawFiles.filter((value): value is File => value instanceof File);

    if (!uploadFiles.length) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    const totalCount = existingAttachments.length + uploadFiles.length;
    if (
      attachmentSettings.maxCountPerPost !== null &&
      totalCount > attachmentSettings.maxCountPerPost
    ) {
      return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
    }

    for (const file of uploadFiles) {
      if (!attachmentSettings.allowedMimeTypes.includes(file.type)) {
        return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
      }
      if (file.size > attachmentSettings.maxSizePerFileBytes) {
        return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
      }
    }

    const serviceRoleSupabase = createSupabaseServiceRoleClient();
    const storageBucket = serviceRoleSupabase.storage.from("board-attachments");

    const created: BoardAttachmentUploadResponseItem[] = [];

    try {
      for (const file of uploadFiles) {
        const originalName = file.name || "attachment.pdf";
        const ext = (originalName.split(".").pop() ?? "pdf").toLowerCase() || "pdf";
        const objectPath = `tenant-${tenantId}/post-${postId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await storageBucket.upload(objectPath, file, {
          contentType: file.type,
        });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const row = await prisma.board_attachments.create({
          data: {
            tenant_id: tenantId,
            post_id: postId,
            file_url: objectPath,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          },
        });

        created.push({
          id: row.id,
          fileName: row.file_name,
          fileType: row.file_type,
          fileSize: row.file_size,
          fileUrl: `/api/board/attachments/${row.id}`,
        });
      }
    } catch (error) {
      logError("board.attachments.api.upload_failed", {
        tenantId,
        postId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ errorCode: "attachment_upload_failed" }, { status: 500 });
    }

    logInfo("board.attachments.api.upload_success", {
      tenantId,
      postId,
      count: created.length,
    });

    return NextResponse.json({ attachments: created }, { status: 201 });
  } catch (error) {
    logError("board.attachments.api.unexpected_error", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ errorCode: "server_error" }, { status: 500 });
  }
}
