CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" integer NOT NULL,
	"perubahan" text NOT NULL,
	"user_id" integer NOT NULL,
	"waktu" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checker_review" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"hasil" text NOT NULL,
	"catatan" text,
	"waktu" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dokumen" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"jenis" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"versi" integer DEFAULT 1 NOT NULL,
	"nama_file" text,
	"dibuat_pada" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gr_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"nama_file_generate" text,
	"path_file_generate" text,
	"digenerate_pada" text,
	"nama_file_balikan_xl" text,
	"path_file_balikan_xl" text,
	"diunggah_balikan_pada" text,
	"diunggah_balikan_oleh_user_id" integer,
	"nama_file_gabungan" text,
	"path_file_gabungan" text,
	"digabung_pada" text,
	"dicek_oleh_user_id" integer,
	"dicek_pada" text,
	"catatan_cek" text,
	CONSTRAINT "gr_request_pengajuan_id_unique" UNIQUE("pengajuan_id")
);
--> statement-breakpoint
CREATE TABLE "gr_request_riwayat" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"langkah" text NOT NULL,
	"nama_file" text,
	"path_file" text,
	"waktu" text NOT NULL,
	"oleh_user_id" integer,
	"catatan" text
);
--> statement-breakpoint
CREATE TABLE "kalender_kerja" (
	"tanggal" text PRIMARY KEY NOT NULL,
	"tipe" text NOT NULL,
	"keterangan" text
);
--> statement-breakpoint
CREATE TABLE "konfirmasi" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"versi_dikonfirmasi" integer NOT NULL,
	"waktu" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lampiran_pengajuan" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"label" text NOT NULL,
	"nama_file" text NOT NULL,
	"path_file" text NOT NULL,
	"diunggah_oleh_user_id" integer NOT NULL,
	"diunggah_pada" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pemetaan_personel_po" (
	"id" serial PRIMARY KEY NOT NULL,
	"personel_id" integer NOT NULL,
	"po_id" integer NOT NULL,
	"berlaku_dari" text NOT NULL,
	"berlaku_sampai" text,
	"po_line_item_id" integer
);
--> statement-breakpoint
CREATE TABLE "pengajuan" (
	"id" serial PRIMARY KEY NOT NULL,
	"periode" text NOT NULL,
	"po_id" integer NOT NULL,
	"user_xl_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"versi" integer DEFAULT 1 NOT NULL,
	"dibuat_pada" text DEFAULT now()::text NOT NULL,
	"keterangan_tahap" text,
	"nomor_gr_slip" text,
	"tanggal_gr_disetujui" text,
	"tanggal_submit_cac" text,
	"tanggal_cac_approved" text,
	"tanggal_request_gr" text,
	"tanggal_submit_invoice" text,
	"tanggal_approve_invoice" text,
	"nomor_invoice" text,
	"approval_alokasi_user_xl_pemberi" text,
	"approval_alokasi_tanggal" text,
	"approval_alokasi_referensi" text
);
--> statement-breakpoint
CREATE TABLE "pengajuan_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengajuan_id" integer NOT NULL,
	"personel_id" integer NOT NULL,
	"hari_kerja_dapat_ditagihkan" integer NOT NULL,
	"hari_kerja_acuan_bulan" integer NOT NULL,
	"nilai_rate_dipakai" text NOT NULL,
	"hasil_hitung" text NOT NULL,
	"nilai_penuh" text,
	"po_line_item_id" integer,
	"sumber_hitung" text DEFAULT 'kalender' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personel" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"status" text DEFAULT 'aktif' NOT NULL,
	"dibuat_pada" text DEFAULT now()::text NOT NULL,
	"penempatan" text
);
--> statement-breakpoint
CREATE TABLE "po" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor_po" text NOT NULL,
	"nama_proyek" text NOT NULL,
	"tahun" integer DEFAULT 2026 NOT NULL,
	"nilai_item" text NOT NULL,
	"saldo_sebelum_ppn" text NOT NULL,
	"nilai_gr" text DEFAULT '0.00' NOT NULL,
	"nama_file_po_asli" text,
	"path_file_po_asli" text,
	"tanggal_po" text,
	"klien" text,
	"jenis_tagihan" text DEFAULT 'bulanan' NOT NULL,
	CONSTRAINT "po_nomor_po_unique" UNIQUE("nomor_po")
);
--> statement-breakpoint
CREATE TABLE "po_line_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_id" integer NOT NULL,
	"nomor_line" integer NOT NULL,
	"short_text" text NOT NULL,
	"qty" integer NOT NULL,
	"harga_satuan" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_card" (
	"id" serial PRIMARY KEY NOT NULL,
	"personel_id" integer NOT NULL,
	"nilai_rate" text NOT NULL,
	"berlaku_dari" text NOT NULL,
	"berlaku_sampai" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dibuat_pada" text DEFAULT now()::text NOT NULL,
	"kedaluwarsa_pada" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet" (
	"id" serial PRIMARY KEY NOT NULL,
	"personel_id" integer NOT NULL,
	"po_id" integer NOT NULL,
	"user_xl_id" integer NOT NULL,
	"periode" text NOT NULL,
	"total_hari_kerja" integer NOT NULL,
	"total_kehadiran" integer NOT NULL,
	"nama_file" text NOT NULL,
	"path_file" text NOT NULL,
	"diunggah_oleh_user_id" integer NOT NULL,
	"diunggah_pada" text DEFAULT now()::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_xl" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kontak" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checker_review" ADD CONSTRAINT "checker_review_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checker_review" ADD CONSTRAINT "checker_review_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gr_request" ADD CONSTRAINT "gr_request_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gr_request" ADD CONSTRAINT "gr_request_diunggah_balikan_oleh_user_id_users_id_fk" FOREIGN KEY ("diunggah_balikan_oleh_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gr_request" ADD CONSTRAINT "gr_request_dicek_oleh_user_id_users_id_fk" FOREIGN KEY ("dicek_oleh_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gr_request_riwayat" ADD CONSTRAINT "gr_request_riwayat_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gr_request_riwayat" ADD CONSTRAINT "gr_request_riwayat_oleh_user_id_users_id_fk" FOREIGN KEY ("oleh_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konfirmasi" ADD CONSTRAINT "konfirmasi_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konfirmasi" ADD CONSTRAINT "konfirmasi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lampiran_pengajuan" ADD CONSTRAINT "lampiran_pengajuan_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lampiran_pengajuan" ADD CONSTRAINT "lampiran_pengajuan_diunggah_oleh_user_id_users_id_fk" FOREIGN KEY ("diunggah_oleh_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pemetaan_personel_po" ADD CONSTRAINT "pemetaan_personel_po_personel_id_personel_id_fk" FOREIGN KEY ("personel_id") REFERENCES "public"."personel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pemetaan_personel_po" ADD CONSTRAINT "pemetaan_personel_po_po_id_po_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."po"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pemetaan_personel_po" ADD CONSTRAINT "pemetaan_personel_po_po_line_item_id_po_line_item_id_fk" FOREIGN KEY ("po_line_item_id") REFERENCES "public"."po_line_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_po_id_po_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."po"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_user_xl_id_user_xl_id_fk" FOREIGN KEY ("user_xl_id") REFERENCES "public"."user_xl"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan_detail" ADD CONSTRAINT "pengajuan_detail_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan_detail" ADD CONSTRAINT "pengajuan_detail_personel_id_personel_id_fk" FOREIGN KEY ("personel_id") REFERENCES "public"."personel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan_detail" ADD CONSTRAINT "pengajuan_detail_po_line_item_id_po_line_item_id_fk" FOREIGN KEY ("po_line_item_id") REFERENCES "public"."po_line_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_line_item" ADD CONSTRAINT "po_line_item_po_id_po_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."po"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_card" ADD CONSTRAINT "rate_card_personel_id_personel_id_fk" FOREIGN KEY ("personel_id") REFERENCES "public"."personel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_personel_id_personel_id_fk" FOREIGN KEY ("personel_id") REFERENCES "public"."personel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_po_id_po_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."po"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_user_xl_id_user_xl_id_fk" FOREIGN KEY ("user_xl_id") REFERENCES "public"."user_xl"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_diunggah_oleh_user_id_users_id_fk" FOREIGN KEY ("diunggah_oleh_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;