"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { addIncidentAttachment, removeIncidentAttachment } from "./actions";
import { MAX_ATTACHMENT_BYTES, type AttachmentMeta } from "./schema";

export type AttachmentItemData = AttachmentMeta & {
  id: string;
  pending?: boolean;
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadAttachmentFile(
  file: File,
  incidentId: string,
): Promise<AttachmentMeta> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^\w.\-()\[\] ]+/g, "_").slice(-160);
  const path = `${incidentId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw new Error(error.message);
  return {
    fileName: file.name.slice(0, 255),
    filePath: path,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export function validateAttachment(file: File) {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${file.name} is over the 10 MB limit`;
  }
  return null;
}

function FileGlyph({ fileName, mimeType }: { fileName: string; mimeType: string }) {
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const isImage = mimeType.startsWith("image/");
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md",
        isPdf ? "bg-red-500/15 text-red-400" : isImage ? "bg-sky-500/15 text-sky-400" : "bg-white/5 text-muted",
      )}
    >
      {isImage ? (
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
          <circle cx="6" cy="6.5" r="1.1" />
          <path d="m2.5 11 3-2.5 2.5 2 3-3 2.5 2.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 1.5h5L12.5 5v9a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z" />
          <path d="M9 1.5V5h3.5" />
        </svg>
      )}
    </span>
  );
}

export function AttachmentRow({
  attachment,
  onRemove,
  compact = false,
}: {
  attachment: AttachmentItemData;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const toast = useToast();
  const [opening, setOpening] = useState(false);

  async function open() {
    if (attachment.pending || opening) return;
    setOpening(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(attachment.filePath, 120);
      if (error || !data?.signedUrl) throw new Error(error?.message);
      window.open(data.signedUrl, "_blank", "noopener");
    } catch {
      toast.push("error", "Could not open the file. Try again.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-line bg-surface-2/40",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
        attachment.pending && "opacity-60",
      )}
    >
      <FileGlyph fileName={attachment.fileName} mimeType={attachment.mimeType} />
      <button
        type="button"
        onClick={open}
        disabled={attachment.pending}
        className="min-w-0 flex-1 truncate text-left text-sm text-neutral-200 hover:underline disabled:no-underline"
      >
        {attachment.fileName}
      </button>
      <span className="shrink-0 text-xs text-muted">
        {attachment.pending ? "Uploading…" : formatBytes(attachment.sizeBytes)}
      </span>
      {onRemove && !attachment.pending ? (
        <button
          type="button"
          aria-label={`Remove ${attachment.fileName}`}
          onClick={onRemove}
          className="flex size-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
        >
          <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="m2.5 2.5 7 7m0-7-7 7" />
          </svg>
        </button>
      ) : null}
    </li>
  );
}

export function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.2 7.3 8.1 12.4a3.4 3.4 0 0 1-4.8-4.8l5.4-5.4a2.3 2.3 0 0 1 3.2 3.2L6.6 10.7a1.1 1.1 0 0 1-1.6-1.6l4.8-4.8" />
    </svg>
  );
}

export function DescriptionAttachments({
  incidentId,
  attachments,
}: {
  incidentId: string;
  attachments: AttachmentItemData[];
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [uploads, setUploads] = useState<AttachmentItemData[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const serverIds = new Set(attachments.map((item) => item.id));
  const visible = [
    ...attachments.filter((item) => !hiddenIds.has(item.id)),
    ...uploads.filter((item) => !serverIds.has(item.id)),
  ];

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const invalid = validateAttachment(file);
      if (invalid) {
        toast.push("error", invalid);
        continue;
      }
      const localId = crypto.randomUUID();
      setUploads((current) => [
        ...current,
        {
          id: localId,
          fileName: file.name,
          filePath: "",
          mimeType: file.type,
          sizeBytes: file.size,
          pending: true,
        },
      ]);
      try {
        const meta = await uploadAttachmentFile(file, incidentId);
        const result = await addIncidentAttachment({ incidentId, attachment: meta });
        if (result.error || !result.id) throw new Error(result.error);
        setUploads((current) =>
          current.map((item) =>
            item.id === localId
              ? { ...meta, id: result.id!, pending: false }
              : item,
          ),
        );
        toast.push("success", `${meta.fileName} attached`);
        router.refresh();
      } catch {
        setUploads((current) => current.filter((item) => item.id !== localId));
        toast.push("error", `Could not upload ${file.name}`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(attachment: AttachmentItemData) {
    setHiddenIds((current) => new Set(current).add(attachment.id));
    setUploads((current) => current.filter((item) => item.id !== attachment.id));
    startTransition(async () => {
      const result = await removeIncidentAttachment({ id: attachment.id });
      if (result.error) {
        setHiddenIds((current) => {
          const next = new Set(current);
          next.delete(attachment.id);
          return next;
        });
        toast.push("error", result.error);
      } else {
        toast.push("success", `${attachment.fileName} removed`);
        router.refresh();
      }
    });
  }

  return (
    <section aria-label="Attachments" className="max-w-3xl">
      <h2 className="mb-2 text-sm font-semibold text-foreground">Attachments</h2>
      {visible.length ? (
        <ul className="flex flex-col gap-2">
          {visible.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              onRemove={() => remove(attachment)}
            />
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted transition-colors hover:bg-white/5 hover:text-neutral-200",
          visible.length ? "mt-2" : "-mx-2",
        )}
      >
        <PaperclipIcon className="size-3.5" />
        Attach a file
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        aria-label="Attach files to the description"
        onChange={(event) => onFilesSelected(event.target.files)}
      />
    </section>
  );
}
