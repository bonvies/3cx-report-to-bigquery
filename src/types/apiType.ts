// 3CX report API 回傳欄位型別，依 REPORT_TYPE 分組。
// 欄位定義依照 logs/BIGQUERY_SETUP.md 記錄的實測結果，新增/調整報表時兩邊要一起更新。

// R-01 通話日誌 Call Log
export type CallLogRecord = {
  ActionDnCallerId: string | null;
  ActionDnDisplayName: string | null;
  actionDnDn: string | null;
  ActionDnType: number | null;
  ActionType: number | null;
  Answered: boolean | null;
  CallCost: number | null;
  CallHistoryId: string | null;
  CallId: number;
  CallType: string | null;
  CdrId: string;
  DestinationCallerId: string | null;
  DestinationDisplayName: string | null;
  DestinationDn: string | null;
  DestinationType: number | null;
  Direction: string | null;
  DstRecId: number | null;
  Indent: number | null;
  MainCallHistoryId: string | null;
  QualityReport: boolean | null;
  Reason: string | null;
  RecordingUrl: string | null;
  RingingDuration: string | null;
  SegmentId: number | null;
  SentimentScore: number | null;
  SourceCallerId: string | null;
  SourceDisplayName: string | null;
  SourceDn: string | null;
  SourceType: number | null;
  SrcRecId: number | null;
  StartTime: string;
  Status: string | null;
  SubrowDescNumber: number | null;
  Summary: string | null;
  TalkingDuration: string | null;
  Transcription: string | null;
  // 只有我們自己的 3CX 會回傳這個欄位，客戶的 3CX 沒有，見 getCallLog.ts 的 omitRecordings。
  Recordings?: unknown[];
};

// R-02 進線規則 Inbound Rules
export type InboundRuleDestination = {
  External?: string;
  Name?: string;
  Number?: string;
  Tags?: string[];
  To?: string;
  Type?: string;
};

export type InboundRuleRecord = {
  RuleName: string;
  DID: string | null;
  Trunk: string | null;
  Id: number;
  InOfficeRouting: InboundRuleDestination;
  OutOfficeRouting: InboundRuleDestination;
};

// InOfficeRouting/OutOfficeRouting 攤平後寫進 BigQuery 的列形狀，見 getInboundRules.ts 的 flattenRecord。
export type InboundRuleRow = {
  RuleName: string;
  DID: string | null;
  Trunk: string | null;
  Id: number;
  InOfficeRouting_To: string | null;
  InOfficeRouting_Number: string | null;
  InOfficeRouting_Name: string | null;
  InOfficeRouting_Type: string | null;
  InOfficeRouting_External: string | null;
  InOfficeRouting_Tags: string | null;
  OutOfficeRouting_To: string | null;
  OutOfficeRouting_Number: string | null;
  OutOfficeRouting_Name: string | null;
  OutOfficeRouting_Type: string | null;
  OutOfficeRouting_External: string | null;
  OutOfficeRouting_Tags: string | null;
};

// R-05 佇列回撥 Queue Callbacks
export type QueueCallbackRecord = {
  QueueDnNumber: string;
  Dn: string;
  ReceivedCount: number;
  CallbacksCount: number;
  FailCallbacksCount: number;
};

// R-04 依等待時間的已接來電 Queue Answered Calls by Waiting Time
export type QueueAnsweredCallsByWaitTimeRecord = {
  CallTime: string;
  Dn: string;
  Destination: string;
  Source: string;
  RingTime: string;
  AnsweredTime: string;
  DnNumber: string;
};

// R-03 放棄的佇列呼叫 Abandoned Queue Calls
export type AbandonedQueueCallRecord = {
  QueueDn: string;
  QueueDisplayName: string;
  CallTime: string;
  CallTimeForCsv: string;
  WaitTime: string;
  CallerId: string;
  ExtensionDn: string;
  ExtensionDisplayName: string;
  CallHistoryId: string;
  PollingAttempts: number;
  IsLoggedIn: boolean;
};

// R-06 SLA 統計 Statistic SLA
export type StatisticSlaRecord = {
  QueueDnNumber: string;
  Dn: string;
  ReceivedCount: number;
  BadSlaCallsCount: number;
};
