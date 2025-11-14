// app/(view)/admin/(panel)/events/modals/EditEventModal.jsx
"use client";

import {
  Modal,
  Form,
  Upload,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Button,
  Spin,
} from "antd";
import styles from "../eventsStyles";
import { isImg, tooBig, numFormatter, numParser } from "../utils/eventUtils";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

export default function EditEventModal({
  open,
  loading,
  initial,
  categoryOptions = [],
  onClose,
  onSubmit,
  submitting = false,
}) {
  const [form] = Form.useForm();
  const [imgPrev, setImgPrev] = useState("");

  useEffect(() => {
    if (!open) return;
    if (!initial) {
      form.resetFields();
      setImgPrev("");
      return;
    }
    setImgPrev(initial.banner_url || "");
    form.setFieldsValue({
      title_id: initial.title_id || "",
      description_id: initial.description_id || "",
      start_at: initial.start_at ? dayjs(initial.start_at) : null,
      end_at: initial.end_at ? dayjs(initial.end_at) : null,
      location: initial.location || "",
      category_id: initial.category_id || undefined,
      capacity: initial.capacity ?? undefined,
      pricing_type: initial.pricing_type || "FREE",
      ticket_price:
        initial.pricing_type === "PAID" ? Number(initial.ticket_price || 0) : 0,
      booth_price: Number(initial.booth_price || 0),
      booth_quota: initial.booth_quota ?? undefined,
      is_published: !!initial.is_published,
      image: [],
    });
  }, [open, initial, form]);

  const beforeImg = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      setImgPrev(URL.createObjectURL(file));
    } catch {}
    return false;
  };
  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);

  const handleSubmit = () => {
    form
      .validateFields()
      .then(onSubmit)
      .catch(() => {});
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        onClose();
        setImgPrev("");
        form.resetFields();
      }}
      footer={null}
      width={960}
      destroyOnClose
      title={null}
    >
      <div style={styles.modalShell}>
        <Spin spinning={loading}>
          <Form layout="vertical" form={form}>
            <div style={styles.coverWrap}>
              <Form.Item
                name="image"
                valuePropName="fileList"
                getValueFromEvent={normList}
                noStyle
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeImg}
                  className="landscape-uploader"
                >
                  <div style={styles.coverBox}>
                    {imgPrev ? (
                      <img src={imgPrev} alt="cover" title="cover" style={styles.coverImg} />
                    ) : (
                      <div style={styles.coverPlaceholder}>+ Banner (16:9)</div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
            </div>

            <Form.Item
              label="Judul (Bahasa Indonesia)"
              name="title_id"
              rules={[{ required: true, message: "Judul wajib diisi" }]}
            >
              <Input placeholder="cth: OSS Education Fair 2025" />
            </Form.Item>

            <Form.Item
              label="Deskripsi (Bahasa Indonesia)"
              name="description_id"
            >
              <Input.TextArea rows={3} placeholder="Deskripsi singkat..." />
            </Form.Item>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item
                label="Mulai"
                name="start_at"
                rules={[{ required: true, message: "Waktu mulai wajib diisi" }]}
              >
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label="Selesai"
                name="end_at"
                rules={[
                  { required: true, message: "Waktu selesai wajib diisi" },
                ]}
              >
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label="Lokasi" name="location">
                <Input placeholder="cth: Bali Nusa Dua Convention Center" />
              </Form.Item>
              <Form.Item label="Kategori" name="category_id">
                <Select
                  allowClear
                  showSearch
                  placeholder="Pilih kategori"
                  options={categoryOptions}
                />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label="Capacity" name="capacity">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                />
              </Form.Item>
              <Form.Item label="Tipe Tiket" name="pricing_type">
                <Select
                  options={[
                    { value: "FREE", label: "FREE" },
                    { value: "PAID", label: "PAID" },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Harga Tiket" name="ticket_price">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label="Booth Price" name="booth_price">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                />
              </Form.Item>
              <Form.Item label="Booth Quota" name="booth_quota">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                />
              </Form.Item>
              <Form.Item label="Published" name="is_published">
                <Select
                  options={[
                    { value: true, label: "Published" },
                    { value: false, label: "Draft" },
                  ]}
                />
              </Form.Item>
            </div>

            <div style={styles.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={submitting}
                style={styles.saveBtn}
              >
                Simpan Perubahan
              </Button>
            </div>
          </Form>
        </Spin>
      </div>
    </Modal>
  );
}
