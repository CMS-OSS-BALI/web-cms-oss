// ProfileContent.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ConfigProvider,
  Form,
  Input,
  Button,
  Upload,
  Skeleton,
  notification,
} from "antd";
import { cropCenterAndResize1x1 } from "@/app/utils/cropper";

export default function ProfileContent({ vm }) {
  const { T, tokens, api, rules, opts } = vm;
  const { shellW, blue, text, headerH } = tokens;
  const AVATAR_SIZE = Number(opts?.avatarSize || 600);
  const ALLOWED = opts?.fileTypes || [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ];
  const MAX_MB = Number(opts?.fileMaxMB || 5);

  const { update: updateSession } = useSession();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [ringHover, setRingHover] = useState(false);

  const initialRef = useRef({
    name: "",
    email: "",
    no_whatsapp: "",
    photo: "",
  });

  const [notifyApi, contextHolder] = notification.useNotification();
  const notifyError = (message, description) =>
    notifyApi.error({ message, description, placement: "topRight" });
  const notifySuccess = (message, description) =>
    notifyApi.success({ message, description, placement: "topRight" });

  useEffect(() => {
    return () => {
      try {
        if (preview && preview.startsWith("blob:"))
          URL.revokeObjectURL(preview);
      } catch {}
    };
  }, [preview]);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(api.me, {
          cache: "no-store",
          credentials: "include",
          headers: { Pragma: "no-cache" },
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          notifyError("Gagal memuat profil", data?.error?.message);
          return;
        }
        const photo = data?.image_public_url || data?.profile_photo || ""; // endpoint baru selalu URL publik
        const init = {
          name: data?.name || "",
          email: data?.email || "",
          no_whatsapp: data?.no_whatsapp || "",
          photo,
        };
        initialRef.current = init;
        form.setFieldsValue({
          name: init.name,
          email: init.email,
          no_whatsapp: init.no_whatsapp,
        });
        setPreview(init.photo);
        setDirty(false);
      } catch (e) {
        if (e?.name !== "AbortError") notifyError("Gagal memuat profil");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [api.me, form]);

  const onValuesChange = () => {
    const v = form.getFieldsValue();
    const init = initialRef.current;
    const changed =
      (v.name || "") !== init.name ||
      (v.email || "") !== init.email ||
      (v.no_whatsapp || "") !== init.no_whatsapp ||
      !!file;
    setDirty(changed);
  };

  const beforeUpload = async (f) => {
    const okType = ALLOWED.includes(f.type);
    if (!okType) {
      notifyError("File tidak didukung", "Harus JPG/PNG/WebP/AVIF");
      return Upload.LIST_IGNORE;
    }
    if (f.size / 1024 / 1024 > MAX_MB) {
      notifyError("Ukuran gambar terlalu besar", `Maksimal ${MAX_MB}MB`);
      return Upload.LIST_IGNORE;
    }

    try {
      const cropped = await cropCenterAndResize1x1(f, AVATAR_SIZE);
      const url = URL.createObjectURL(cropped);
      try {
        if (preview && preview.startsWith("blob:"))
          URL.revokeObjectURL(preview);
      } catch {}
      setFile(cropped);
      setPreview(url);
      setDirty(true);
    } catch {
      try {
        const blobUrl = URL.createObjectURL(f);
        setFile(f);
        setPreview(blobUrl);
      } catch {
        setFile(f);
      }
      setDirty(true);
    }
    return Upload.LIST_IGNORE;
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", values.name || "");
      fd.append("no_whatsapp", values.no_whatsapp || "");
      fd.append("email", (values.email || "").trim());
      fd.append("size", String(AVATAR_SIZE));
      if (file) fd.append("avatar", file); // field disesuaikan dg endpoint baru

      const res = await fetch(api.update, {
        method: "PATCH",
        body: fd,
        credentials: "include",
        headers: { Pragma: "no-cache" },
      });
      const out = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          out?.error?.message ||
          (out?.error?.code === "PAYLOAD_TOO_LARGE"
            ? `Max file ${MAX_MB}MB`
            : out?.error?.code === "UNSUPPORTED_TYPE"
            ? "Gunakan JPG/PNG/WebP/AVIF"
            : "Gagal menyimpan profil");
        notifyError("Gagal menyimpan profil", msg);
        return;
      }

      const photo =
        out?.image_public_url || out?.profile_photo || preview || "";

      const nextInit = {
        name: out?.name ?? values.name,
        email: out?.email ?? values.email,
        no_whatsapp: out?.no_whatsapp ?? values.no_whatsapp,
        photo,
      };
      initialRef.current = nextInit;

      form.setFieldsValue({
        name: nextInit.name,
        email: nextInit.email,
        no_whatsapp: nextInit.no_whatsapp,
      });

      try {
        if (preview && preview.startsWith("blob:"))
          URL.revokeObjectURL(preview);
      } catch {}
      setPreview(photo);
      setFile(null);
      setDirty(false);

      notifySuccess(T.success);

      try {
        new BroadcastChannel("profile").postMessage("updated");
      } catch {
        try {
          localStorage.setItem("profile.updated", String(Date.now()));
        } catch {}
      }
      try {
        await updateSession?.({});
      } catch {}
    } catch {
      notifyError("Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    const init = initialRef.current;
    form.setFieldsValue({
      name: init.name,
      email: init.email,
      no_whatsapp: init.no_whatsapp,
    });
    setFile(null);
    try {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    } catch {}
    setPreview(init.photo);
    setDirty(false);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          borderRadius: 16,
          fontFamily:
            '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        },
        components: {
          Input: { controlHeight: 44, borderRadiusLG: 16 },
          Button: { borderRadius: 14 },
        },
      }}
    >
      {contextHolder}

      <section
        style={{
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          marginTop: -headerH,
          paddingTop: headerH,
          background:
            "linear-gradient(180deg, #f8fbff 0%, #eef5ff 40%, #ffffff 100%)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "flex-start",
          paddingBottom: 48,
        }}
      >
        <div style={{ width: shellW, margin: "0 auto", padding: "24px 0 0" }}>
          <div style={styles.card}>
            <div style={styles.uploadWrap}>
              <Upload.Dragger
                accept="image/*"
                showUploadList={false}
                beforeUpload={beforeUpload}
                style={styles.dragger}
              >
                <div
                  style={{
                    ...styles.circle,
                    borderColor: ringHover ? "#8fb4ff" : "#c0c8d8",
                  }}
                  onMouseEnter={() => setRingHover(true)}
                  onMouseLeave={() => setRingHover(false)}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt={`Avatar ${form.getFieldValue("name") || ""}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div style={styles.placeholder}>
                      <div style={styles.plus}>+</div>
                      <div style={styles.hint}>{T.uploadHint}</div>
                    </div>
                  )}
                </div>
              </Upload.Dragger>
              <div style={styles.photoLabel}>{T.photo}</div>
            </div>

            <div style={{ marginTop: 18 }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : (
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onSubmit}
                  onValuesChange={onValuesChange}
                  requiredMark={false}
                >
                  <Form.Item label={T.name} name="name" rules={rules.name}>
                    <Input placeholder="Nama lengkap" />
                  </Form.Item>

                  <Form.Item label={T.email} name="email" rules={rules.email}>
                    <Input placeholder="email@domain.com" maxLength={191} />
                  </Form.Item>

                  <Form.Item
                    label={T.phone}
                    name="no_whatsapp"
                    rules={rules.phone}
                  >
                    <Input placeholder="08xxxx | +62xxxx" maxLength={32} />
                  </Form.Item>

                  <div style={styles.actions}>
                    <Button onClick={onReset}>{T.reset}</Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={saving}
                      disabled={!dirty || saving}
                    >
                      {T.save}
                    </Button>
                  </div>
                </Form>
              )}
            </div>
          </div>
        </div>
      </section>
    </ConfigProvider>
  );
}

const AVATAR_SIZE_PX = 136;

const styles = {
  card: {
    position: "relative",
    background: "#ffffff",
    border: "1px solid #e6eeff",
    borderRadius: 24,
    boxShadow:
      "0 14px 68px rgba(11, 86, 201, 0.08), 0 4px 16px rgba(11,86,201,0.06)",
    padding: "28px 24px 24px",
  },
  uploadWrap: {
    display: "grid",
    placeItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  dragger: {
    width: AVATAR_SIZE_PX,
    height: AVATAR_SIZE_PX,
    border: "none",
    background: "transparent",
    padding: 0,
  },
  circle: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    border: "2px dashed #c0c8d8",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    background: "#fff",
    transition: "border-color .15s ease",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    position: "relative",
  },
  plus: {
    fontSize: 42,
    lineHeight: 1,
    color: "#0b56c9",
    marginTop: -6,
    userSelect: "none",
  },
  hint: {
    position: "absolute",
    bottom: 6,
    fontSize: 11,
    color: "#94a3b8",
    background: "rgba(255,255,255,0.9)",
    padding: "2px 6px",
    borderRadius: 6,
  },
  photoLabel: { marginTop: 8, fontSize: 12, color: "#475569" },
  actions: {
    marginTop: 8,
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
};
