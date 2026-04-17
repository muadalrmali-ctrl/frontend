import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CaseAttachment, CaseAttachmentType } from "@/lib/case-attachments";
import { ImageIcon, Mic, Square, Trash2, Upload, VideoIcon, Volume2 } from "lucide-react";

type CaseAttachmentUploaderProps = {
  title: string;
  description?: string;
  type: CaseAttachmentType;
  attachments: CaseAttachment[];
  accept: string;
  uploading?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  enableRecorder?: boolean;
  uploadLabel?: string;
  onUpload: (files: File[]) => Promise<void>;
};

const supportsMimeType = (value: string) =>
  typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function"
    ? MediaRecorder.isTypeSupported(value)
    : false;

const getRecorderMimeType = () => {
  if (supportsMimeType("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (supportsMimeType("audio/webm")) return "audio/webm";
  if (supportsMimeType("audio/mp4")) return "audio/mp4";
  return "";
};

const formatAttachmentDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : null;

export function CaseAttachmentUploader({
  title,
  description,
  type,
  attachments,
  accept,
  uploading,
  disabled,
  multiple = true,
  maxItems,
  emptyMessage,
  enableRecorder = false,
  uploadLabel = "رفع ملفات",
  onUpload,
}: CaseAttachmentUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [recordedAudioFile, setRecordedAudioFile] = useState<File | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const canAddMore = maxItems === undefined || attachments.length < maxItems;

  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordedAudioUrl]);

  const attachmentCountLabel = useMemo(() => {
    if (maxItems === undefined) return `${attachments.length} مرفق`;
    return `${attachments.length}/${maxItems} مرفق`;
  }, [attachments.length, maxItems]);

  const resetRecordedAudio = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }

    setRecordedAudioFile(null);
    setRecordedAudioUrl(null);
  };

  const stopStreamTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    setError(null);

    try {
      await onUpload(files);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع المرفقات.");
    }
  };

  const startRecording = async () => {
    if (disabled || uploading) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("التسجيل الصوتي غير مدعوم في هذا المتصفح. يمكنك رفع ملف صوتي مباشرة.");
      return;
    }

    setError(null);
    setIsPreparingRecording(true);

    try {
      resetRecordedAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const extension = blobType.includes("mp4") ? "m4a" : blobType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: blobType });
        const previewUrl = URL.createObjectURL(blob);

        setRecordedAudioFile(file);
        setRecordedAudioUrl(previewUrl);
        setIsRecording(false);
        stopStreamTracks();
      };

      recorder.start();
      setIsRecording(true);
    } catch (recordingError) {
      setError(recordingError instanceof Error ? recordingError.message : "تعذر بدء التسجيل الصوتي.");
      stopStreamTracks();
    } finally {
      setIsPreparingRecording(false);
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
  };

  const uploadRecordedAudio = async () => {
    if (!recordedAudioFile) return;

    setError(null);

    try {
      await onUpload([recordedAudioFile]);
      resetRecordedAudio();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع التسجيل الصوتي.");
    }
  };

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Label>{title}</Label>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{attachmentCountLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-sm"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          disabled={disabled || uploading || !canAddMore}
        />
        <span className="text-xs text-muted-foreground">{uploadLabel}</span>
      </div>

      {enableRecorder && type === "audio" ? (
        <div className="grid gap-3 rounded-lg border border-dashed p-4">
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={startRecording} disabled={disabled || uploading || isRecording || isPreparingRecording}>
              <Mic className="size-4" />
              {isPreparingRecording ? "جارٍ تجهيز الميكروفون..." : "بدء تسجيل صوتي"}
            </Button>
            <Button type="button" variant="outline" onClick={stopRecording} disabled={!isRecording}>
              <Square className="size-4" />
              إيقاف التسجيل
            </Button>
            <Button type="button" variant="ghost" onClick={resetRecordedAudio} disabled={!recordedAudioFile}>
              <Trash2 className="size-4" />
              حذف التسجيل
            </Button>
          </div>
          {isRecording ? <p className="text-sm text-amber-600">التسجيل جاري الآن. اضغط إيقاف عند الانتهاء.</p> : null}
          {recordedAudioUrl ? (
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">معاينة التسجيل قبل الرفع</p>
              <audio controls src={recordedAudioUrl} className="w-full" />
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={uploadRecordedAudio} disabled={disabled || uploading}>
                  <Upload className="size-4" />
                  رفع التسجيل
                </Button>
                <Button type="button" variant="outline" onClick={startRecording} disabled={disabled || uploading || isRecording}>
                  <Mic className="size-4" />
                  إعادة التسجيل
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <AttachmentGallery
        attachments={attachments}
        emptyMessage={emptyMessage || "لا توجد مرفقات مرفوعة بعد."}
        className={type === "image" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-3"}
      />
    </div>
  );
}

export function AttachmentGallery({
  attachments,
  emptyMessage,
  className,
}: {
  attachments: CaseAttachment[];
  emptyMessage: string;
  className?: string;
}) {
  if (attachments.length === 0) {
    return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className={cn(className)}>
      {attachments.map((attachment) => (
        <AttachmentCard key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}

function AttachmentCard({ attachment }: { attachment: CaseAttachment }) {
  const Icon = attachment.type === "video" ? VideoIcon : attachment.type === "audio" ? Volume2 : ImageIcon;
  const formattedDate = formatAttachmentDate(attachment.createdAt);

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        <span className="truncate">{attachment.fileName}</span>
      </div>

      {attachment.type === "image" ? (
        <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted/30">
          <img src={attachment.publicUrl} alt={attachment.fileName} className="h-full w-full object-cover" />
        </div>
      ) : null}

      {attachment.type === "video" ? (
        <div className="overflow-hidden rounded-lg border bg-black">
          <video src={attachment.publicUrl} controls className="aspect-video w-full object-contain" />
        </div>
      ) : null}

      {attachment.type === "audio" ? <audio src={attachment.publicUrl} controls className="w-full" /> : null}

      <div className="grid gap-1 text-xs text-muted-foreground">
        <span>التصنيف: {attachment.category}</span>
        {formattedDate ? <span>تم الرفع: {formattedDate}</span> : null}
      </div>
    </div>
  );
}
