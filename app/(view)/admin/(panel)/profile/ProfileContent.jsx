"use client";

import { useEffect, useState } from "react";
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

export default function ProfileContent({ vm }) {
  const { T, tokens, api, rules } = vm;
  const { shellW, blue, text, headerH } = tokens;

  const { update: updateSession } = useSession();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);

  // antd notification (topRight)
  const [notifyApi, contextHolder] = notification.useNotification();
  const notifyError = (message, description) =>
    notifyApi.error({ message, description, placement: "topRight" });
  const notifySuccess = (message, description) =>
    notifyApi.success({ message, description, placement: "topRight" });

  // cleanup blob URL saat preview berubah/komponen unmount
  useEffect(() => {
    return () => {
      try {
        if (preview && preview.startsWith("blob:"))
          URL.revokeObjectURL(preview);
      } catch {}
    };
  }, [preview]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(api.me, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          notifyError("Gagal memuat profil", data?.error?.message);
          return;
        }
        form.setFieldsValue({
          name: data?.name || "",
          email: data?.email || "",
          no_whatsapp: data?.no_whatsapp || "",
        });
        setPreview(data?.profile_photo || "");
      } catch {
        notifyError("Gagal memuat profil");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api.me, form]);

  const beforeUpload = (f) => {
    const okType =
      f.type === "image/jpeg" ||
      f.type === "image/png" ||
      f.type === "image/webp";
    if (!okType) {
      notifyError("File tidak didukung", "Harus JPG/PNG/WebP");
      return Upload.LIST_IGNORE;
    }
    if (f.size / 1024 / 1024 >= 2) {
      notifyError("Ukuran gambar terlalu besar", "Maksimal 2MB");
      return Upload.LIST_IGNORE;
    }
    try {
      const blobUrl = URL.createObjectURL(f);
      setFile(f);
      setPreview(blobUrl);
    } catch {
      setFile(f);
    }
    return false; // prevent auto-upload
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", values.name || "");
      fd.append("no_whatsapp", values.no_whatsapp || "");
      fd.append("email", (values.email || "").trim());
      if (file) fd.append("avatar", file);

      const res = await fetch(api.update, { method: "PATCH", body: fd });
      const out = await res.json().catch(() => ({}));

      if (!res.ok) {
        notifyError("Gagal menyimpan profil", out?.error?.message);
        return;
      }

      form.setFieldsValue({
        name: out?.name ?? values.name,
        email: out?.email ?? values.email,
        no_whatsapp: out?.no_whatsapp ?? values.no_whatsapp,
      });

      // ganti preview ke URL publik dari server (revoke blob lama jika ada)
      try {
        if (preview && preview.startsWith("blob:"))
          URL.revokeObjectURL(preview);
      } catch {}
      setPreview(out?.profile_photo || preview);
      setFile(null);

      notifySuccess(T.success);

      // ---- HINDARI FULL RELOAD ----
      // 1) Broadcast ke channel "profile" agar header (useHeaderViewModel) melakukan mutate()
      try {
        new BroadcastChannel("profile").postMessage("updated");
      } catch {}

      // 2) Trigger session.update() → callback jwt(trigger:"update") akan refresh token.picture dari DB
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
    form.resetFields();
    // reset preview ke server value terakhir (tanpa reload)
    setFile(null);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          borderRadius: 16,
          fontFamily:
            '"Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        },
        components: {
          Input: { controlHeight: 44, borderRadiusLG: 16 },
          Button: { borderRadius: 14 },
        },
      }}
    >
      {/* contextHolder wajib dirender sekali */}
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
                {preview ? (
                  <div style={styles.previewBox}>
                    <img
                      src={preview}
                      alt="avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 12,
                      }}
                    />
                  </div>
                ) : (
                  <div style={styles.placeholder}>
                    <div style={styles.plus}>+</div>
                    <div style={styles.hint}>{T.uploadHint}</div>
                  </div>
                )}
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
                    <Button type="primary" htmlType="submit" loading={saving}>
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
    width: 128,
    height: 128,
    border: "2px dashed #c0c8d8",
    borderRadius: 12,
    background: "#fff",
  },
  previewBox: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    position: "relative",
  },
  plus: {
    fontSize: 48,
    lineHeight: 1,
    color: "#e11d48",
    marginTop: -6,
    userSelect: "none",
  },
  hint: {
    position: "absolute",
    bottom: 6,
    fontSize: 11,
    color: "#94a3b8",
    background: "rgba(255,255,255,0.85)",
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
