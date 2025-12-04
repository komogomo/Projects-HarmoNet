import { NextRequest, NextResponse } from "next/server";
import {
  getSystemAdminApiContext,
  SystemAdminApiError,
} from "@/src/lib/auth/systemAdminAuth";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { adminClient } = await getSystemAdminApiContext();
    const { tenantId } = await context.params;

    let payload: any;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "Invalid request body" },
        { status: 400 },
      );
    }

    const { tenantName, timezone, status } = payload ?? {};

    const updateData: any = {};

    if (typeof tenantName === "string" && tenantName.trim() !== "") {
      updateData.tenant_name = tenantName;
    }
    if (typeof timezone === "string" && timezone.trim() !== "") {
      updateData.timezone = timezone;
    }
    if (status === "active" || status === "inactive") {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, message: "\u66f4\u65b0\u5bfe\u8c61\u306e\u9805\u76ee\u304c\u3042\u308a\u307e\u305b\u3093\u3002" },
        { status: 400 },
      );
    }

    const { error } = await adminClient
      .from("tenants")
      .update(updateData)
      .eq("id", tenantId);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "テナント情報の更新に失敗しました。時間をおいて再度お試しください。",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SystemAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { adminClient } = await getSystemAdminApiContext();
    const { tenantId } = await context.params;

    // --- 0. Delete Application Data (Board, Announcements, Facilities, Logs, etc.) ---

    // Storage Data (board-attachments)
    const storageBucket = adminClient.storage.from("board-attachments");
    const tenantFolder = `tenant-${tenantId}`;

    try {
      let hasMore = true;
      while (hasMore) {
        const { data: files, error: listError } = await storageBucket.list(tenantFolder, {
          limit: 100,
        });

        if (listError) {
          console.error("Error listing storage files:", listError);
          break;
        }

        if (!files || files.length === 0) {
          hasMore = false;
          break;
        }

        const pathsToDelete = files.map((file) => `${tenantFolder}/${file.name}`);
        const { error: removeError } = await storageBucket.remove(pathsToDelete);

        if (removeError) {
          console.error("Error removing storage files:", removeError);
          break;
        }

        if (files.length < 100) {
          hasMore = false;
        }
      }
    } catch (storageError) {
      console.error("Unexpected error during storage cleanup:", storageError);
      // Continue with DB deletion even if storage cleanup fails
    }

    // Board Data
    // board_posts deletion will cascade to comments, reactions, attachments, logs, favorites, translations
    const { error: postsError } = await adminClient
      .from("board_posts")
      .delete()
      .eq("tenant_id", tenantId);
    if (postsError) console.error("Error deleting board_posts:", postsError);

    const { error: categoriesError } = await adminClient
      .from("board_categories")
      .delete()
      .eq("tenant_id", tenantId);
    if (categoriesError) console.error("Error deleting board_categories:", categoriesError);

    // Announcement Data
    // announcements deletion will cascade to reads, targets
    const { error: announcementsError } = await adminClient
      .from("announcements")
      .delete()
      .eq("tenant_id", tenantId);
    if (announcementsError) console.error("Error deleting announcements:", announcementsError);

    // Facility Data
    // Delete from child to parent just in case
    await adminClient.from("facility_reservations").delete().eq("tenant_id", tenantId);
    await adminClient.from("facility_slots").delete().eq("tenant_id", tenantId);
    await adminClient.from("facility_settings").delete().eq("tenant_id", tenantId);
    const { error: facilitiesError } = await adminClient
      .from("facilities")
      .delete()
      .eq("tenant_id", tenantId);
    if (facilitiesError) console.error("Error deleting facilities:", facilitiesError);

    // Logs & Settings & Residents
    await adminClient.from("moderation_logs").delete().eq("tenant_id", tenantId);
    await adminClient.from("tenant_settings").delete().eq("tenant_id", tenantId);
    await adminClient.from("tenant_shortcut_menu").delete().eq("tenant_id", tenantId);

    // Cache & Notifications
    await adminClient.from("board_favorites").delete().eq("tenant_id", tenantId);

    await adminClient.from("translation_cache").delete().eq("tenant_id", tenantId);
    await adminClient.from("tts_cache").delete().eq("tenant_id", tenantId);
    await adminClient.from("notifications").delete().eq("tenant_id", tenantId);
    await adminClient.from("user_notification_settings").delete().eq("tenant_id", tenantId);

    // --- 1. Delete User Relations ---

    // 1. Delete user_roles associated with the tenant
    const { error: rolesError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("tenant_id", tenantId);

    if (rolesError) {
      console.error("Error deleting user_roles:", rolesError);
      throw new Error("Failed to delete user roles");
    }

    // 2. Delete user_tenants associated with the tenant
    const { error: userTenantsError } = await adminClient
      .from("user_tenants")
      .delete()
      .eq("tenant_id", tenantId);

    if (userTenantsError) {
      console.error("Error deleting user_tenants:", userTenantsError);
      throw new Error("Failed to delete user tenants");
    }

    // 3. Delete users associated with the tenant (main tenant)
    // First, fetch user IDs to delete from Supabase Auth
    const { data: usersToDelete, error: fetchUsersError } = await adminClient
      .from("users")
      .select("id")
      .eq("tenant_id", tenantId);

    if (fetchUsersError) {
      console.error("Error fetching users to delete:", fetchUsersError);
      // Continue to delete from public.users even if fetch fails?
      // Better to fail here to avoid inconsistency if possible, but for deletion we might want to be aggressive.
      // Let's log and proceed, but ideally we should ensure Auth deletion.
    }

    if (usersToDelete && usersToDelete.length > 0) {
      const deleteAuthPromises = usersToDelete.map(async (user) => {
        // Skip if user.id is not a valid UUID (e.g. legacy data or test data)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(user.id)) {
          console.warn(`Skipping auth deletion for non-UUID user id: ${user.id}`);
          return;
        }

        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
          user.id
        );
        if (deleteAuthError) {
          console.error(
            `Error deleting auth user ${user.id}:`,
            deleteAuthError
          );
        }
      });
      await Promise.all(deleteAuthPromises);
    }

    // Then delete from public.users
    const { error: usersError } = await adminClient
      .from("users")
      .delete()
      .eq("tenant_id", tenantId);

    if (usersError) {
      console.error("Error deleting users:", usersError);
      throw new Error("Failed to delete users");
    }

    // --- 2. Delete Tenant ---

    // 4. Finally, delete the tenant
    const { error } = await adminClient
      .from("tenants")
      .delete()
      .eq("id", tenantId);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "\u30c6\u30ca\u30f3\u30c8\u306e\u524a\u9664\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u95a2\u9023\u3059\u308b\u30c7\u30fc\u30bf\u304c\u6b8b\u3063\u3066\u3044\u306a\u3044\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SystemAdminApiError) {
      if (error.code === 'unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.code === 'forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    throw error;
  }
}
