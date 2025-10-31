"use client";

import {
  ConfigProvider,
  Card,
  Typography,
  Form,
  Input,
  Select,
  Button,
  Space,
  Divider,
  Alert,
  Tag,
  Row,
  Col,
  Upload,
  Modal,
  Skeleton,
} from "antd";
import { Mail, Users, Building2, PlayCircle, Eye, XCircle } from "lucide-react";
import HtmlEditor from "@/../app/components/editor/HtmlEditor";
import useBlastViewModel from "./useBlastViewModel";

/* ===== compact tokens (selaras halaman lain) ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
  panel: "#ffffff",
  border: "#e6eeff",
  subText: "#64748b",
};

export default function BlastContent(props) {
  const vm = props?.subject ? props : useBlastViewModel();
  const { shellW, maxW, blue, text } = TOKENS;

  /* ===== Header Card ===== */
  const HeaderCard = () => (
    <div style={styles.cardOuter}>
      <div style={styles.cardHeaderBar} />
      <div style={styles.cardInner}>
        <div style={styles.cardTitle}>Blast Email</div>
        <div style={{ color: "#5b75a1", fontSize: 13 }}>
          Kirim email massal ke pilihan <b>Kampus</b> dan{" "}
          <b>Mitra Dalam Negeri</b> tanpa input manual.
        </div>
      </div>
    </div>
  );

  return (
    <ConfigProvider
      componentSize="middle"
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          fontFamily:
            '"Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 12,
          fontSize: 13,
          controlHeight: 36,
        },
        components: { Button: { borderRadius: 10 } },
      }}
    >
      {/* Page wrapper */}
      <section
        style={{
          width: "100%",
          position: "relative",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "flex-start",
          padding: "56px 0",
          overflowX: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #f8fbff 0%, #eef5ff 40%, #ffffff 100%)",
            zIndex: 0,
          }}
        />
        <div
          style={{
            width: shellW,
            maxWidth: maxW,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <HeaderCard />

          {/* ===== Global overrides khusus editor ===== */}
          <style jsx global>{`
            .card-surface {
              background: ${TOKENS.panel};
              border: 1px solid ${TOKENS.border};
              border-radius: 16px;
              box-shadow: 0 10px 40px rgba(11, 86, 201, 0.07),
                0 3px 12px rgba(11, 86, 201, 0.05);
            }

            /* ================= EDITOR (paksa LIGHT) ================= */
            .blast-editor {
              border: 1px solid ${TOKENS.border};
              border-radius: 12px;
              background: #fff !important;
              overflow: hidden;
              box-shadow: inset 0 2px 6px rgba(11, 86, 201, 0.04);
              color-scheme: light; /* cegah mode gelap otomatis */
            }

            /* --- Quill toolbar (ql-snow / ql-bubble) --- */
            .blast-editor .ql-toolbar,
            .blast-editor .ql-toolbar.ql-snow,
            .blast-editor .ql-toolbar.ql-bubble,
            .blast-editor .he-toolbar,
            .blast-editor .tiptap-toolbar,
            .blast-editor .editor-toolbar {
              background: #f5f8ff !important;
              border: 0 !important;
              border-bottom: 1px solid ${TOKENS.border} !important;
              padding: 6px 10px !important;
              border-radius: 12px 12px 0 0 !important;
            }

            /* Warna icon & teks toolbar */
            .blast-editor .ql-toolbar button,
            .blast-editor .ql-toolbar .ql-picker-label,
            .blast-editor .ql-toolbar .ql-picker-item,
            .blast-editor .he-toolbar button,
            .blast-editor .tiptap-toolbar button,
            .blast-editor .editor-toolbar button {
              color: ${TOKENS.text} !important;
              opacity: 0.95;
            }
            .blast-editor .ql-toolbar .ql-stroke {
              stroke: ${TOKENS.text} !important;
            }
            .blast-editor .ql-toolbar .ql-fill {
              fill: ${TOKENS.text} !important;
            }
            .blast-editor .ql-toolbar button:hover,
            .blast-editor .ql-toolbar .ql-picker-label:hover,
            .blast-editor .he-toolbar button:hover,
            .blast-editor .tiptap-toolbar button:hover,
            .blast-editor .editor-toolbar button:hover {
              background: #ebf2ff !important;
              border-radius: 8px;
              opacity: 1;
            }
            .blast-editor .ql-toolbar button.ql-active,
            .blast-editor .ql-toolbar .ql-picker-label.ql-active {
              background: #e6f0ff !important;
              border-radius: 8px;
            }

            /* Dropdown Quill (Normal, Heading, dsb.) */
            .blast-editor .ql-picker.ql-expanded .ql-picker-options {
              background: #ffffff !important;
              border: 1px solid ${TOKENS.border} !important;
              box-shadow: 0 8px 24px rgba(2, 32, 71, 0.08) !important;
            }
            .blast-editor .ql-picker.ql-expanded .ql-picker-label {
              color: ${TOKENS.text} !important;
              background: #ebf2ff !important;
              border-radius: 8px 8px 0 0 !important;
            }

            /* Kontainer isi */
            .blast-editor .ql-container,
            .blast-editor .ql-container.ql-snow,
            .blast-editor .tiptap-content,
            .blast-editor .ProseMirror,
            .blast-editor .editor-content {
              background: #fff !important;
              border: 0 !important;
              min-height: 260px;
            }
            .blast-editor .ql-editor,
            .blast-editor .tiptap-content,
            .blast-editor .ProseMirror {
              padding: 10px 12px !important;
              font-size: 14px;
              line-height: 1.65;
              color: ${TOKENS.text};
            }
            .blast-editor .ProseMirror p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: #9aa7bd;
              pointer-events: none;
              height: 0;
            }
            .blast-editor pre {
              background: #0b1223;
              color: #e7edf6;
              border-radius: 10px;
              padding: 10px 12px;
            }

            /* Upload dragger */
            .blast-upload.ant-upload-wrapper .ant-upload-drag {
              background: #f8fbff;
              border: 1px dashed ${TOKENS.border};
              border-radius: 12px;
            }
            .blast-upload .ant-upload-text,
            .blast-upload .ant-upload-hint {
              color: ${TOKENS.subText};
            }
          `}</style>

          <Row gutter={[20, 20]} style={{ marginTop: 12 }}>
            <Col xs={24} lg={16}>
              <div className="card-surface" style={{ padding: 16 }}>
                <Form layout="vertical" onFinish={vm.onSend} colon={false}>
                  <Row gutter={12}>
                    <Col span={24}>
                      <Form.Item
                        label="Subject"
                        required
                        tooltip="Subjek email yang akan diterima penerima"
                      >
                        <Input
                          placeholder="Subjek email…"
                          value={vm.subject}
                          onChange={(e) => vm.setSubject(e.target.value)}
                        />
                      </Form.Item>
                    </Col>

                    <Col span={24}>
                      <Form.Item
                        required
                        label={
                          <Space size={6}>
                            <Mail size={16} />
                            <span>Konten</span>
                          </Space>
                        }
                      >
                        <div className="blast-editor">
                          <HtmlEditor
                            /* kalau HtmlEditor punya prop theme/variant, ini membantu */
                            theme="light"
                            variant="email"
                            value={vm.html}
                            onChange={vm.setHtml}
                            minHeight={240}
                            placeholder="Tulis konten…"
                          />
                        </div>
                      </Form.Item>
                    </Col>

                    <Col span={24}>
                      <Form.Item label="Lampiran (opsional)">
                        <Upload.Dragger
                          className="blast-upload"
                          name="attachment"
                          maxCount={1}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                          customRequest={({ onSuccess }) => {
                            onSuccess && onSuccess("ok");
                          }}
                          beforeUpload={(file) => {
                            vm.onSelectAttachment(file);
                            return false;
                          }}
                          onRemove={() =>
                            new Promise((resolve) => {
                              Modal.confirm({
                                title: "Hapus lampiran?",
                                content: "Tindakan ini tidak dapat dibatalkan.",
                                okText: "Hapus",
                                okButtonProps: { danger: true },
                                cancelText: "Batal",
                                onOk: () => {
                                  vm.removeAttachment();
                                  resolve(true);
                                },
                                onCancel: () => resolve(false),
                              });
                            })
                          }
                          fileList={vm.attachmentFileList}
                        >
                          <p style={{ margin: 0 }}>
                            Drop file di sini atau klik untuk pilih.
                          </p>
                          <p style={{ margin: 0, fontSize: 12 }}>
                            Format umum: PDF, DOC(X), XLS(X), JPG, PNG, TXT
                          </p>
                        </Upload.Dragger>
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        label={
                          <Space size={6}>
                            <Users size={16} />
                            <span>Pilih Kampus</span>
                          </Space>
                        }
                      >
                        <Select
                          mode="multiple"
                          allowClear
                          showSearch
                          filterOption={false}
                          placeholder="Cari & pilih kampus…"
                          value={vm.collegeIds}
                          options={vm.collegeOptions}
                          onSearch={vm.searchColleges}
                          onChange={vm.setCollegeIds}
                          loading={vm.loadingColleges}
                          maxTagCount="responsive"
                          dropdownRender={(menu) => (
                            <div>
                              <div style={styles.dropdownHead}>
                                <Button
                                  type="text"
                                  size="small"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    vm.setCollegeIds(
                                      (vm.collegeOptions || []).map(
                                        (o) => o.value
                                      )
                                    );
                                  }}
                                >
                                  Pilih Semua
                                </Button>
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => vm.setCollegeIds([])}
                                >
                                  Kosongkan
                                </Button>
                              </div>
                              <Divider
                                style={{
                                  margin: "6px 0",
                                  borderColor: TOKENS.border,
                                }}
                              />
                              {menu}
                            </div>
                          )}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        label={
                          <Space size={6}>
                            <Building2 size={16} />
                            <span>Pilih Mitra Dalam Negeri</span>
                          </Space>
                        }
                      >
                        <Select
                          mode="multiple"
                          allowClear
                          showSearch
                          filterOption={false}
                          placeholder="Cari & pilih Mitra Dalam Negeri…"
                          value={vm.mitraIds}
                          options={vm.mitraOptions}
                          onSearch={vm.searchMitras}
                          onChange={vm.setMitraIds}
                          loading={vm.loadingMitras}
                          maxTagCount="responsive"
                          dropdownRender={(menu) => (
                            <div>
                              <div style={styles.dropdownHead}>
                                <Button
                                  type="text"
                                  size="small"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    vm.setMitraIds(
                                      (vm.mitraOptions || []).map(
                                        (o) => o.value
                                      )
                                    );
                                  }}
                                >
                                  Pilih Semua
                                </Button>
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => vm.setMitraIds([])}
                                >
                                  Kosongkan
                                </Button>
                              </div>
                              <Divider
                                style={{
                                  margin: "6px 0",
                                  borderColor: TOKENS.border,
                                }}
                              />
                              {menu}
                            </div>
                          )}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {vm.error && (
                    <Alert
                      type="error"
                      showIcon
                      style={{ marginBottom: 12 }}
                      message={vm.error}
                    />
                  )}

                  <Space wrap>
                    <Button
                      icon={<Eye size={16} />}
                      onClick={vm.onPreview}
                      loading={vm.previewing}
                    >
                      Preview
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlayCircle size={16} />}
                      htmlType="submit"
                      loading={vm.sending}
                      disabled={!vm.canSend}
                    >
                      Kirim
                    </Button>
                    {vm.sending && (
                      <Button
                        danger
                        icon={<XCircle size={16} />}
                        onClick={vm.onCancel}
                      >
                        Batal
                      </Button>
                    )}
                  </Space>

                  <Divider style={{ borderColor: TOKENS.border }} />

                  {/* Logs */}
                  {vm.sending && vm.logs.length === 0 && (
                    <Skeleton active paragraph={{ rows: 2 }} />
                  )}
                  {vm.logs?.length > 0 && (
                    <div
                      className="modal-scroll"
                      style={{ maxHeight: 280, overflow: "auto" }}
                    >
                      {vm.summary && (
                        <div
                          style={{
                            marginBottom: 8,
                            color: TOKENS.subText,
                            fontSize: 12,
                          }}
                        >
                          Total {vm.summary.total} • Sent {vm.summary.sent} •
                          Failed {vm.summary.failed}
                        </div>
                      )}
                      {vm.logs.map((l, i) => (
                        <div
                          key={i}
                          style={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 12,
                            marginBottom: 4,
                          }}
                        >
                          {l.type === "start" && (
                            <span>Start • total {l.total}</span>
                          )}
                          {l.type === "progress" && (
                            <>
                              {l.ok ? "✅" : "❌"} <b>{l.to}</b>
                              {!l.ok && (
                                <span style={{ color: "#b91c1c" }}>
                                  {" "}
                                  — {l.error}
                                </span>
                              )}
                            </>
                          )}
                          {l.type === "done" && (
                            <b>
                              Done • sent {l.sent} / {l.total} • failed{" "}
                              {l.failed}
                            </b>
                          )}
                          {l.type === "error" && (
                            <span style={{ color: "#b91c1c" }}>
                              ERROR • {l.message}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Form>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div className="card-surface" style={{ padding: 16 }}>
                <Typography.Text strong style={{ color: "#0b3e91" }}>
                  Preview Penerima
                </Typography.Text>
                <div style={{ marginTop: 8 }}>
                  {!vm.preview?.recipients?.length ? (
                    <Typography.Text style={{ color: TOKENS.subText }}>
                      Klik <b>Preview</b> untuk melihat daftar penerima
                      (di-dedup).
                    </Typography.Text>
                  ) : (
                    <>
                      <div
                        style={{
                          color: TOKENS.subText,
                          fontSize: 12,
                          marginBottom: 8,
                        }}
                      >
                        Total {vm.preview.count} penerima
                      </div>
                      <div
                        className="modal-scroll"
                        style={{ maxHeight: 280, overflow: "auto" }}
                      >
                        {vm.preview.recipients.slice(0, 200).map((em) => (
                          <Tag key={em} style={{ marginBottom: 6 }}>
                            {em}
                          </Tag>
                        ))}
                        {vm.preview.recipients.length > 200 && (
                          <div
                            style={{
                              color: TOKENS.subText,
                              marginTop: 6,
                              fontSize: 12,
                            }}
                          >
                            +{vm.preview.recipients.length - 200} lagi…
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>
    </ConfigProvider>
  );
}

/* ===== styles ===== */
const styles = {
  cardOuter: {
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid #e6eeff",
    boxShadow:
      "0 10px 40px rgba(11, 86, 201, 0.07), 0 3px 12px rgba(11,86,201,0.05)",
    overflow: "hidden",
  },
  cardHeaderBar: {
    height: 20,
    background:
      "linear-gradient(90deg, #0b56c9 0%, #0b56c9 65%, rgba(11,86,201,0.35) 100%)",
  },
  cardInner: { padding: "12px 14px 14px", position: "relative" },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0b3e91",
    marginTop: 8,
    marginBottom: 8,
  },
  dropdownHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 8px",
    color: "#64748b",
  },
};
