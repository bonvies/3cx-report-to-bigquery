// 3CX report API 回傳欄位型別，依 REPORT_TYPE 分組。
// 欄位定義依照 logs/BIGQUERY_SETUP.md 記錄的實測結果，新增/調整報表時兩邊要一起更新。

// R-01 通話日誌 Call Log
// ActionDnCallerId/ActionDnDisplayName/actionDnDn/SentimentScore/Summary/Transcription 實測 50 筆
// 真實資料一次都沒出現過（$metadata 確認是合法欄位，只是這批資料剛好沒有觸發到相關功能，例如
// AI 通話摘要/情緒分析、或call被轉接/action到其他分機的情境）；DstRecId/RecordingUrl/SrcRecId
// 則是部分出現（14/50）。都是 3CX 的通例：值為 null 時整個 key 不會出現在回應裡，不是回傳
// null，所以這裡都改成 optional，不用 `| null`。
export type CallLogRecord = {
  ActionDnCallerId?: string;
  ActionDnDisplayName?: string;
  actionDnDn?: string;
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
  DstRecId?: number;
  Indent: number | null;
  MainCallHistoryId: string | null;
  QualityReport: boolean | null;
  Reason: string | null;
  RecordingUrl?: string;
  RingingDuration: string | null;
  SegmentId: number | null;
  SentimentScore?: number;
  SourceCallerId: string | null;
  SourceDisplayName: string | null;
  SourceDn: string | null;
  SourceType: number | null;
  SrcRecId?: number;
  StartTime: string;
  Status: string | null;
  SubrowDescNumber: number | null;
  Summary?: string;
  TalkingDuration: string | null;
  Transcription?: string;
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
// 同一通被放棄的電話如果依序 poll 過不只一個分機（同一個 CallHistoryId 出現多列），實測發現只有
// 第一列有 CallTime，後面幾列只有 CallTimeForCsv、沒有 CallTime——CallTime 因此是 optional。
export type AbandonedQueueCallRecord = {
  QueueDn: string;
  QueueDisplayName: string;
  CallTime?: string;
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

// R-13 進線通話報表 Inbound Call Report（U6+）
// RecordingId/RecordingUrl 只有這通電話有錄音才會出現，沒有錄音時整個 key 不存在。
export type InboundCallRecord = {
  CdrId: string;
  CallHistoryId: string;
  StartTime: string;
  TrunkName: string;
  TrunkNumber: string;
  Did: string;
  SourceDn: string;
  SourceCallerId: string;
  SourceDisplayName: string;
  DestinationDn: string;
  DestinationCallerId: string;
  DestinationDisplayName: string;
  Status: string;
  RingingDuration: string;
  TalkingDuration: string;
  CallDuration: string;
  RecordingId?: number;
  RecordingUrl?: string;
  QualityReport: boolean;
};

// R-14 撥出通話報表 Outbound Call Report（U6+）
// RecordingId/RecordingUrl 只有這通電話有錄音才會出現，沒有錄音時整個 key 不存在（跟 R-13 同一種行為）。
export type OutboundCallRecord = {
  CdrId: string;
  CallHistoryId: string;
  StartTime: string;
  TrunkName: string;
  TrunkNumber: string;
  SourceDn: string;
  SourceCallerId: string;
  SourceDisplayName: string;
  DestinationDn: string;
  DestinationCalleeId: string;
  DestinationDisplayName: string;
  Answered: boolean;
  Status: string;
  RingingDuration: string;
  TalkingDuration: string;
  CallDuration: string;
  CallCost: number;
  RecordingId?: number;
  RecordingUrl?: string;
  QualityReport: boolean;
};

// R-15 使用者活動 User Activity（U6+）
// 跟前面幾張逐筆通話報表不同，這張是依時間區段分桶的彙總計數，不是逐筆通話清單。
export type UserActivityRecord = {
  DateTimeInterval: string;
  AnsweredCount: number;
  UnansweredCount: number;
};

// R-16 通話分佈 Call Distribution（U6+）
// 跟 R-15 同一個函式家族，簽章一致，只有回傳欄位不同：依時間區段分桶的彙總計數，不是逐筆通話清單。
export type CallDistributionRecord = {
  DateTimeInterval: string;
  OutgoingCount: number;
  IncomingCount: number;
};

// R-17 分機統計 Extension Statistics — 每個分機一列的彙總報表，本身沒有自然時間欄位（跟 R-09/R-12 同一種形狀）。
// 實際端點是 ReportExtensionStatisticsByGroup/Pbx.GetExtensionStatisticsByGroupData，不是原本猜的
// ReportExtensionStatistics/Pbx.GetExtensionStatisticsData（那支一律 500，可能是壞的或沒授權）。
// 這個分機在這段區間沒有對應類型的通話時，整個欄位不存在（3CX null-omission pattern），不是 0。
export type ExtensionStatisticsByGroupRecord = {
  Dn: string;
  DisplayName: string;
  InboundAnsweredCount?: number;
  InboundAnsweredTalkingDur?: string;
  InboundUnansweredCount?: number;
  OutboundAnsweredCount?: number;
  OutboundAnsweredTalkingDur?: string;
  OutboundUnansweredCount?: number;
  SentimentScore?: number;
};

// R-18 通話費用（分機／部門） Call Cost by Extension Dept — 逐筆通話清單（不是彙總數字），
// 跟 R-13/R-14 同一種形狀，本身有 StartTime 業務時間欄位。
export type CallCostByExtensionGroupRecord = {
  SegId: string;
  GroupName: string;
  SrcDn: string;
  SrcDisplayName: string;
  StartTime: string;
  DstDn: string;
  DstDnClass: number;
  IsAnswered: boolean;
  TalkingDur: string;
  RingingDur: string;
  BillingCost: number;
  CallType: string;
};
