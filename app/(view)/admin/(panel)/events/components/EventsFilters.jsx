// app/(view)/admin/(panel)/events/components/EventsFilters.jsx
"use client";

import { Input, Select, Button } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  QrcodeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import styles from "../eventsStyles";

export default function EventsFilters({
  q,
  onChangeQ,
  onEnterSearch,
  year,
  yearOptions,
  setYear,
  categoryId,
  categoryOptions,
  setCategoryId,
  onDownloadCSV,
  onOpenScanner,
  onOpenCreate,
  searchPlaceholder = "Cari event (judul/kategori/tahun)",
}) {
  return (
    <div style={{ ...styles.cardOuter, marginTop: 12 }}>
      <div style={{ ...styles.cardInner, paddingTop: 14 }}>
        <div style={styles.filtersRowBig}>
          <Input
            allowClear
            value={q}
            onChange={(e) => onChangeQ(e.target.value)}
            onPressEnter={(e) => onEnterSearch(e.currentTarget.value)}
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined />}
            style={styles.searchInput}
          />
          <Select
            value={year ?? "ALL"}
            onChange={(v) => setYear(v === "ALL" ? null : Number(v))}
            options={[
              { value: "ALL", label: "Semua Tahun" },
              ...(yearOptions || []).map((y) => ({
                value: String(y),
                label: String(y),
              })),
            ]}
            style={{ minWidth: 140 }}
            suffixIcon={<FilterOutlined />}
          />
          <Select
            showSearch
            allowClear
            placeholder="Kategori"
            value={categoryId || undefined}
            onChange={(v) => setCategoryId(v || null)}
            filterOption={(input, opt) =>
              String(opt?.label ?? "")
                .toLowerCase()
                .includes(String(input).toLowerCase())
            }
            options={categoryOptions}
            style={{ minWidth: 220, width: "100%" }}
          />
          <Button icon={<DownloadOutlined />} onClick={onDownloadCSV}>
            Download CSV
          </Button>
          <Button icon={<QrcodeOutlined />} onClick={onOpenScanner}>
            Scanner
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={onOpenCreate}>
            Buat Event
          </Button>
        </div>
      </div>
    </div>
  );
}
