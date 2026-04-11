-- P4: スキーマ拡張マイグレーション
-- 実行前に必ずバックアップを取ること

-- ① colors テーブル拡張
ALTER TABLE public.colors
  ADD COLUMN IF NOT EXISTS is_trashed     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trashed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS cmyk_profile   text;

-- ② folders テーブル拡張
ALTER TABLE public.folders
  ADD COLUMN IF NOT EXISTS icon      text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

-- ③ color_folders 中間テーブル（色とフォルダの多対多）
CREATE TABLE IF NOT EXISTS public.color_folders (
  color_id  uuid NOT NULL REFERENCES public.colors(id)  ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  PRIMARY KEY (color_id, folder_id)
);

-- RLS
ALTER TABLE public.color_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own color_folders"
  ON public.color_folders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.colors c
      WHERE c.id = color_id AND c.user_id = auth.uid()
    )
  );

-- ④ 既存の folder_id データを color_folders に移行
INSERT INTO public.color_folders (color_id, folder_id)
SELECT id, folder_id
FROM public.colors
WHERE folder_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ⑤ colors.folder_id カラムを削除（移行完了後）
-- ※ 移行データを確認してから手動で実行すること
-- ALTER TABLE public.colors DROP COLUMN folder_id;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_color_folders_color_id  ON public.color_folders(color_id);
CREATE INDEX IF NOT EXISTS idx_color_folders_folder_id ON public.color_folders(folder_id);
CREATE INDEX IF NOT EXISTS idx_colors_is_trashed        ON public.colors(is_trashed);
CREATE INDEX IF NOT EXISTS idx_colors_trashed_at        ON public.colors(trashed_at);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id        ON public.folders(parent_id);
