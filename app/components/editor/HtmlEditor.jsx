"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill/dist/quill.snow.css"; // style dasar Quill

// render hanya di client
const ReactQuill = dynamic(() => import("react-quill"), {
  ssr: false,
  loading: () => <div style={{ padding: 8 }}>Memuat editor…</div>,
});

// Preset toolbar praktis
const TOOLBARS = {
  mini: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
  email: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "blockquote", "code"],
    ["clean"],
  ],
  full: [
    [{ font: [] }, { header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike", "blockquote", "code-block"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [
      { list: "ordered" },
      { list: "bullet" },
      { indent: "-1" },
      { indent: "+1" },
    ],
    [{ align: [] }, { direction: "rtl" }],
    ["link", "image", "video"],
    ["clean"],
  ],
};

export default function HtmlEditor({
  value,
  onChange,
  placeholder = "Tulis konten…",
  variant = "email", // "mini" | "email" | "full"
  toolbar, // array custom jika ingin override
  readOnly = false,
  className,
  style,
  minHeight = 200,
}) {
  const modules = useMemo(
    () => ({
      toolbar: toolbar ?? TOOLBARS[variant] ?? TOOLBARS.email,
      clipboard: { matchVisual: false },
    }),
    [toolbar, variant]
  );

  const formats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "code",
    "code-block",
    "color",
    "background",
    "script",
    "list",
    "bullet",
    "indent",
    "align",
    "direction",
    "link",
    "image",
    "video",
  ];

  return (
    <div className={className} style={style}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ minHeight }}
      />
    </div>
  );
}
