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

// R-07 佇列績效總覽 Queue Performance Overview — 實際 API 是 ReportQueuePerformanceTotals/Pbx.GetQueuePerformanceTotalsData
// QueueReceivedCount/ExtensionAnsweredCount/ExtensionDroppedCount 實測發現只有計數不為 0 才會出現在回應裡，
// 計數是 0 的欄位整個 key 都不見（不是回傳 0 或 null），所以這裡都是 optional。
export type QueuePerformanceTotalsRecord = {
  QueueDn: string;
  QueueDisplayName: string;
  QueueReceivedCount?: number;
  ExtensionAnsweredCount?: number;
  ExtensionDroppedCount?: number;
};

// R-08 詳細佇列統計 Detailed Queue Statistics
export type DetailedQueueStatisticsRecord = {
  QueueDnNumber: string;
  QueueDn: string;
  CallsCount: number;
  AnsweredCount: number;
  RingTime: string;
  AvgRingTime: string;
  TalkTime: string;
  AvgTalkTime: string;
  CallbacksCount: number;
};

// R-09 團隊佇列總體統計 Team Queue General Statistics
export type TeamQueueGeneralStatisticsRecord = {
  QueueDnNumber: string;
  Dn: string;
  AgentsInQueueCount: number;
  ReceivedCount: number;
  AnsweredCount: number;
  TotalTalkTime: string;
  AvgTalkTime: string;
};

// R-10 佇列專員統計 Agents in Queue Statistics
export type AgentsInQueueStatisticsRecord = {
  Dn: string;
  DnDisplayName: string;
  Queue: string;
  QueueDisplayName: string;
  LoggedInTime: string;
  LostCount: number;
  AnsweredCount: number;
  AnsweredPercent: number;
  AnsweredPerHourCount: number;
  RingTime: string;
  AvgRingTime: string;
  TalkTime: string;
  AvgTalkTime: string;
};

// R-11 專員登入歷史 Agent Login History — 每一列是「某個專員在某個 queue 底下、某一天」的登入彙總。
// loggedInDt 刻意維持 API 原本的小寫開頭，其餘欄位都是 PascalCase（3CX 這支 API 本身命名就不一致）。
export type AgentLoginHistoryRecord = {
  QueueNo: string;
  AgentNo: string;
  Agent: string;
  Day: string;
  loggedInDt: string;
  LoggedOutDt: string;
  LoggedInInterval: string;
  LoggedInDayInterval: string;
  LoggedInTotalInterval: string;
  TalkingInterval: string;
  TalkingDayInterval: string;
  TalkingTotalInterval: string;
};

// R-12 響鈴群組統計 Ring Groups
export type RingGroupStatisticsRecord = {
  RingGroupDn: string;
  RingGroupDisplayName: string;
  RingGroupReceivedCount: number;
  RingGroupAnsweredCount: number;
};
