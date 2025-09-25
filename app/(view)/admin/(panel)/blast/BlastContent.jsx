"use client";

import { Card, Typography, Form, Input, Select, Button, Space, Divider, Alert, Tag, Row, Col, Upload, Modal } from "antd";
import { Mail, Users, Building2, PlayCircle, Eye, XCircle } from "lucide-react";
import HtmlEditor from "@/../app/components/editor/HtmlEditor";

export default function BlastContent(vm) {
  return (
    // ⟵ scope untuk styling dark khusus halaman ini
    <div className="page-wrap blast-page">
      <Card
        className="card-dark card-hover"
        styles={{ body: { padding: 16 } }}
        style={{ marginBottom: 20 }}
      >
        <Typography.Title level={2} style={{ margin: 0, color: "#e5e7eb" }}>
          Blast Email
        </Typography.Title>
        <Typography.Text style={{ color: "#9fb1d1" }}>
          Kirim email massal ke pilihan Partners / Mitra Dalam Negeri tanpa input manual.
        </Typography.Text>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card className="card-dark card-hover" styles={{ body: { padding: 16 } }}>
            <Form layout="vertical" onFinish={vm.onSend} colon={false}>
              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item label="Subject" required>
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
                    <HtmlEditor
                      className="editor-dark"
                      variant="email"
                      value={vm.html}
                      onChange={vm.setHtml}
                      minHeight={240}
                    />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item label="Lampiran">
                    <Upload.Dragger
                      name="attachment"
                      multiple={false}
                      maxCount={1}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                      customRequest={({ onSuccess }) => {
                        // prevent actual upload; we handle locally
                        onSuccess && onSuccess("ok");
                      }}
                      beforeUpload={(file) => {
                        vm.onSelectAttachment(file);
                        return false; // block auto upload
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
                      <p style={{ color: "#cbd5e1", margin: 0 }}>
                        Drop file di sini atau klik untuk pilih.
                      </p>
                      <p style={{ color: "#94a3b8", margin: 0, fontSize: 12 }}>
                        Format umum: PDF, DOC(X), XLS(X), JPG, PNG, TXT
                      </p>
                    </Upload.Dragger>
                    <style jsx global>{`
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-name {
                        color: #ffffff !important;
                      }
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-name
                        .anticon {
                        color: #ffffff !important;
                      }
                      /* make paperclip/attach icon white */
                      .blast-page .ant-upload-list-item .anticon-paper-clip {
                        color: #ffffff !important;
                      }
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-name-icon {
                        color: #ffffff !important;
                      }
                      .blast-page .ant-upload-list-item .ant-upload-text-icon {
                        color: #ffffff !important;
                      }
                      /* always show actions (trash) */
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-actions {
                        opacity: 1 !important;
                        visibility: visible !important;
                        display: inline-flex !important;
                        align-items: center;
                      }
                      /* force trash icon/link red even when not hovered */
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-actions
                        a,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-action,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-actions
                        .anticon,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-action
                        .anticon,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-actions
                        .anticon-delete,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-actions
                        .ant-btn,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-actions
                        .ant-btn
                        .anticon,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-action
                        .ant-btn,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-action
                        .ant-btn
                        .anticon {
                        color: #ef4444 !important;
                      }
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-actions
                        .anticon
                        svg,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-action
                        .anticon
                        svg {
                        fill: currentColor;
                        color: #ef4444 !important;
                      }
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-actions
                        .anticon:hover,
                      .blast-page
                        .ant-upload-list-item
                        .ant-upload-list-item-action:hover {
                        color: #dc2626 !important; /* darker red on hover */
                      }
                    `}</style>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label={
                      <Space size={6}>
                        <Users size={16} />
                        <span>Pilih Partners</span>
                      </Space>
                    }
                  >
                    <Select
                      mode="multiple"
                      allowClear
                      showSearch
                      filterOption={false}
                      placeholder="Cari & pilih partners…"
                      value={vm.partnerIds}
                      options={vm.partnerOptions}
                      onSearch={vm.searchPartners}
                      onChange={vm.setPartnerIds}
                      loading={vm.loadingPartners}
                      optionFilterProp="label"
                      maxTagCount="responsive"
                      dropdownRender={(menu) => (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "6px 8px",
                              color: "#cbd5e1",
                            }}
                          >
                            <Button
                              type="text"
                              size="small"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                const all = (vm.partnerOptions || []).map(
                                  (o) => o.value
                                );
                                vm.setPartnerIds(all);
                              }}
                            >
                              Pilih Semua
                            </Button>
                            <Button
                              type="text"
                              size="small"
                              danger
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                vm.setPartnerIds([]);
                              }}
                            >
                              Kosongkan
                            </Button>
                          </div>
                          <Divider
                            style={{ margin: "6px 0", borderColor: "#2f3f60" }}
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
                      value={vm.merchantIds}
                      options={vm.merchantOptions}
                      onSearch={vm.searchMerchants}
                      onChange={vm.setMerchantIds}
                      loading={vm.loadingMerchants}
                      optionFilterProp="label"
                      maxTagCount="responsive"
                      dropdownRender={(menu) => (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "6px 8px",
                              color: "#cbd5e1",
                            }}
                          >
                            <Button
                              type="text"
                              size="small"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                const all = (vm.merchantOptions || []).map(
                                  (o) => o.value
                                );
                                vm.setMerchantIds(all);
                              }}
                            >
                              Pilih Semua
                            </Button>
                            <Button
                              type="text"
                              size="small"
                              danger
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                vm.setMerchantIds([]);
                              }}
                            >
                              Kosongkan
                            </Button>
                          </div>
                          <Divider
                            style={{ margin: "6px 0", borderColor: "#2f3f60" }}
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
                  className="btn-ghost-dark"
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
            </Form>

            <Divider style={{ borderColor: "#2f3f60" }} />

            {vm.logs?.length > 0 && (
              <div
                className="modal-scroll"
                style={{ maxHeight: 280, overflow: "auto" }}
              >
                {vm.summary && (
                  <div
                    style={{ marginBottom: 8, color: "#cbd5e1", fontSize: 12 }}
                  >
                    Total {vm.summary.total} • Sent {vm.summary.sent} • Failed{" "}
                    {vm.summary.failed}
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
                    {l.type === "start" && <span>Start • total {l.total}</span>}
                    {l.type === "progress" && (
                      <>
                        {l.ok ? "✅" : "❌"} <b>{l.to}</b>
                        {!l.ok && (
                          <span style={{ color: "#fca5a5" }}> — {l.error}</span>
                        )}
                      </>
                    )}
                    {l.type === "done" && (
                      <b>
                        Done • sent {l.sent} / {l.total} • failed {l.failed}
                      </b>
                    )}
                    {l.type === "error" && (
                      <span style={{ color: "#fca5a5" }}>
                        ERROR • {l.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="card-dark card-hover" styles={{ body: { padding: 16 } }}>
            <Typography.Text strong style={{ color: "#e5e7eb" }}>
              Preview Penerima
            </Typography.Text>
            <div style={{ marginTop: 8 }}>
              {!vm.preview?.recipients?.length ? (
                <Typography.Text style={{ color: "#94a3b8" }}>
                  Klik <b>Preview</b> untuk melihat daftar penerima (di-dedup).
                </Typography.Text>
              ) : (
                <>
                  <div
                    style={{ color: "#cbd5e1", fontSize: 12, marginBottom: 8 }}
                  >
                    Total {vm.preview.count} penerima
                  </div>
                  <div
                    className="modal-scroll"
                    style={{ maxHeight: 280, overflow: "auto" }}
                  >
                    {vm.preview.recipients.slice(0, 200).map((em) => (
                      <Tag
                        key={em}
                        className="tag-ghost"
                        style={{ marginBottom: 6 }}
                      >
                        {em}
                      </Tag>
                    ))}
                    {vm.preview.recipients.length > 200 && (
                      <div
                        style={{ color: "#94a3b8", marginTop: 6, fontSize: 12 }}
                      >
                        +{vm.preview.recipients.length - 200} lagi…
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

