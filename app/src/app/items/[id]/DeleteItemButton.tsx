"use client";

import { deleteItemAction } from "@/app/items/actions";

export function DeleteItemButton({ id, nickname }: { id: string; nickname: string }) {
  return (
    <form
      action={deleteItemAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete ${nickname}? Its code, photo, 3D model and history go with it. Printed stickers will stop working.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-danger">
        Delete item
      </button>
    </form>
  );
}
