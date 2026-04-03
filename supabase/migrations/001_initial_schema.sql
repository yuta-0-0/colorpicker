-- ============================================================
-- ColorPicker - Initial Schema
-- ============================================================

-- ENUM: CMYKの入力元
CREATE TYPE cmyk_source AS ENUM ('manual', 'converted', 'print_spec');

-- ============================================================
-- テーブル: folders
-- ============================================================
CREATE TABLE folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  "order"     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- テーブル: colors
-- ============================================================
CREATE TABLE colors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id    UUID REFERENCES folders(id) ON DELETE SET NULL,
  hex          TEXT NOT NULL,
  alpha        FLOAT NOT NULL DEFAULT 1.0 CHECK (alpha >= 0.0 AND alpha <= 1.0),
  c            FLOAT CHECK (c IS NULL OR (c >= 0 AND c <= 100)),
  m            FLOAT CHECK (m IS NULL OR (m >= 0 AND m <= 100)),
  y            FLOAT CHECK (y IS NULL OR (y >= 0 AND y <= 100)),
  k            FLOAT CHECK (k IS NULL OR (k >= 0 AND k <= 100)),
  cmyk_source  cmyk_source,
  name         TEXT NOT NULL DEFAULT '',
  spot_color   TEXT,
  memo         TEXT,
  is_locked    BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite  BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  "order"      INTEGER NOT NULL DEFAULT 0,
  used_count   INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT hex_format CHECK (hex ~ '^#[0-9A-Fa-f]{6}$')
);

-- ============================================================
-- テーブル: tags
-- ============================================================
CREATE TABLE tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE (user_id, name)
);

-- ============================================================
-- テーブル: color_tags（中間テーブル）
-- ============================================================
CREATE TABLE color_tags (
  color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (color_id, tag_id)
);

-- ============================================================
-- テーブル: invitations（クローズドベータ管理）
-- ============================================================
CREATE TABLE invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL UNIQUE,
  used_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER colors_updated_at
  BEFORE UPDATE ON colors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX idx_colors_user_id     ON colors(user_id);
CREATE INDEX idx_colors_folder_id   ON colors(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX idx_colors_hex         ON colors(user_id, hex);
CREATE INDEX idx_colors_updated_at  ON colors(user_id, updated_at DESC);
CREATE INDEX idx_colors_is_favorite ON colors(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_colors_is_archived ON colors(user_id, is_archived);
CREATE INDEX idx_folders_user_id    ON folders(user_id);
CREATE INDEX idx_tags_user_id       ON tags(user_id);
CREATE INDEX idx_color_tags_tag_id  ON color_tags(tag_id);

-- ============================================================
-- RLS（Row Level Security）の有効化
-- ============================================================
ALTER TABLE colors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLSポリシー: colors
-- ============================================================
CREATE POLICY "colors: ユーザーは自分の色のみ操作可" ON colors
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLSポリシー: folders
-- ============================================================
CREATE POLICY "folders: ユーザーは自分のフォルダのみ操作可" ON folders
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLSポリシー: tags
-- ============================================================
CREATE POLICY "tags: ユーザーは自分のタグのみ操作可" ON tags
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLSポリシー: color_tags
-- ============================================================
CREATE POLICY "color_tags: 自分の色に対するタグのみ操作可" ON color_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM colors
      WHERE colors.id = color_tags.color_id
        AND colors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM colors
      WHERE colors.id = color_tags.color_id
        AND colors.user_id = auth.uid()
    )
  );

-- ============================================================
-- RLSポリシー: invitations
-- ============================================================
CREATE POLICY "invitations: 未使用コードは誰でも読める" ON invitations
  FOR SELECT
  USING (used_by IS NULL);

CREATE POLICY "invitations: 使用済みコードは本人のみ" ON invitations
  FOR SELECT
  USING (used_by = auth.uid());

CREATE POLICY "invitations: 使用登録はログイン済みのみ" ON invitations
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (used_by = auth.uid());

-- ============================================================
-- 保存数上限チェック関数（500色/ユーザー）
-- ============================================================
CREATE OR REPLACE FUNCTION check_color_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM colors WHERE user_id = NEW.user_id
  ) >= 500 THEN
    RAISE EXCEPTION 'COLOR_LIMIT_EXCEEDED: 保存できる色の上限（500色）に達しています';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_color_limit
  BEFORE INSERT ON colors
  FOR EACH ROW
  EXECUTE FUNCTION check_color_limit();
