export type FaceCoordinate = {
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  is_redacted: boolean;
  label?: string;
};

export type TelemetryData = {
  make?: string;
  model?: string;
  software?: string;
  capture_time?: string;
  upload_time?: string;
  time_delta_seconds?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  has_gps: boolean;
  waiver_signed?: boolean;
  waiver_timestamp?: string;
  submitter_ip?: string;
};

export type ModerationResult = {
  status: 'approved' | 'action_required' | 'quarantined';
  confidence?: number;
  categories: string[];
};

export type MediaAsset = {
  public_id: string;
  asset_id?: string;
  format: string;
  resource_type: string;
  width: number;
  height: number;
  bytes: number;
  secure_url: string;
  faces: FaceCoordinate[];
  telemetry: TelemetryData;
  moderation: ModerationResult;
  review_status: 'quarantined' | 'action_required' | 'approved';
  incident_type: string;
  urgency: 'breaking' | 'standard';
  headline?: string;
  syndication_urls: {
    broadcast_16_9?: string;
    broadcast_16_9_clean?: string;
    social_9_16?: string;
    feed_1_1?: string;
    clean_master?: string;
    video_highlight_6s?: string;
  };
  is_archived?: boolean;
  created_at: string;
};
