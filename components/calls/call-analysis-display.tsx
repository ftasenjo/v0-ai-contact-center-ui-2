"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  UserCheck,
  Clock,
  Star,
  Lock,
  Unlock,
  Zap,
  Target,
  FileText,
  BarChart3,
} from "lucide-react"
import type { CallAnalysisRow } from "@/lib/automation/types"

interface CallAnalysisDisplayProps {
  analysis: CallAnalysisRow
}

export function CallAnalysisDisplay({ analysis }: CallAnalysisDisplayProps) {
  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
    }
    return <Badge variant={variants[severity] || "outline"}>{severity}</Badge>
  }

  const getQualityColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground"
    if (score >= 8) return "text-green-600"
    if (score >= 6) return "text-yellow-600"
    return "text-red-600"
  }

  const getSentimentIcon = (sentiment: string | null) => {
    if (!sentiment) return null
    const lower = sentiment.toLowerCase()
    if (lower.includes("positive") || lower.includes("happy")) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    }
    if (lower.includes("negative") || lower.includes("frustrated") || lower.includes("angry")) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return null
  }

  const qualityPercentage = analysis.quality_score !== null ? (analysis.quality_score / 10) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Main Analysis Card */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Complete Call Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Call Summary */}
          {analysis.call_summary && (
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Summary
              </div>
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {analysis.call_summary}
              </div>
            </div>
          )}

          {/* Key Performance Metrics */}
          <div>
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Performance Metrics
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quality Score with Progress Bar */}
              {analysis.quality_score !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Quality Score</div>
                    <div className={`font-bold text-lg ${getQualityColor(analysis.quality_score)}`}>
                      {analysis.quality_score}/10
                    </div>
                  </div>
                  <Progress value={qualityPercentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {qualityPercentage >= 80
                      ? "Excellent"
                      : qualityPercentage >= 60
                        ? "Good"
                        : qualityPercentage >= 40
                          ? "Needs Improvement"
                          : "Poor"}
                  </div>
                </div>
              )}

              {/* Customer Sentiment */}
              {analysis.customer_sentiment && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Customer Sentiment</div>
                    {getSentimentIcon(analysis.customer_sentiment)}
                  </div>
                  <div className="text-lg font-semibold capitalize">{analysis.customer_sentiment}</div>
                  <div className="text-xs text-muted-foreground">
                    {analysis.customer_frustrated ? "Frustration detected" : "Normal interaction"}
                  </div>
                </div>
              )}

              {/* Issue Resolution Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Resolution Status</div>
                  {analysis.issue_resolved ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div className="text-lg font-semibold">
                  {analysis.issue_resolved ? "Resolved" : "Pending"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {analysis.issue_resolved ? "Issue successfully resolved" : "Follow-up required"}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Issue Classification */}
          {(analysis.issue_type || analysis.issue_severity) && (
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Issue Classification
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {analysis.issue_type && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Type</div>
                    <Badge variant="outline" className="text-sm">{analysis.issue_type}</Badge>
                  </div>
                )}
                {analysis.issue_severity && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Severity</div>
                    {getSeverityBadge(analysis.issue_severity)}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Action Flags & Alerts */}
          <div>
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Action Items & Alerts
            </div>
            <div className="space-y-2">
              {analysis.escalation_required && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-red-600">Escalation Required</div>
                    <div className="text-xs text-muted-foreground">This call requires immediate escalation to a supervisor</div>
                  </div>
                </div>
              )}
              {analysis.compliance_verified === false && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-red-600">Compliance Review Required</div>
                    <div className="text-xs text-muted-foreground">Compliance verification failed - manual review needed</div>
                  </div>
                </div>
              )}
              {analysis.supervisor_review_needed && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                  <UserCheck className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-yellow-600">Supervisor Review Needed</div>
                    <div className="text-xs text-muted-foreground">This call should be reviewed by a supervisor</div>
                  </div>
                </div>
              )}
              {analysis.customer_frustrated && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-orange-600 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-orange-600">Customer Frustrated</div>
                    <div className="text-xs text-muted-foreground">Customer showed signs of frustration during the call</div>
                  </div>
                </div>
              )}
              {analysis.quality_score !== null && analysis.quality_score <= 6 && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-yellow-600">QA Coaching Candidate</div>
                    <div className="text-xs text-muted-foreground">
                      Quality score {analysis.quality_score}/10 - consider coaching opportunities
                    </div>
                  </div>
                </div>
              )}
              {analysis.issue_resolved === false && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-yellow-600">Follow-up Required</div>
                    <div className="text-xs text-muted-foreground">Issue was not resolved - follow-up action needed</div>
                  </div>
                </div>
              )}
              {analysis.issue_resolved && !analysis.escalation_required && analysis.compliance_verified !== false && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-green-600">Call Completed Successfully</div>
                    <div className="text-xs text-muted-foreground">Issue resolved and no action items required</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Security & Authentication */}
          {(analysis.identity_verified !== null || analysis.step_up_auth_required) && (
            <div>
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security & Authentication
              </div>
              <div className="grid grid-cols-2 gap-4">
                {analysis.identity_verified !== null && (
                  <div className="flex items-center gap-2">
                    {analysis.identity_verified ? (
                      <Lock className="h-4 w-4 text-green-600" />
                    ) : (
                      <Unlock className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Identity Verified</div>
                      <div className="text-sm font-medium">
                        {analysis.identity_verified ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>
                )}
                {analysis.step_up_auth_required && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-xs text-muted-foreground">Step-up Authentication</div>
                      <div className="text-sm font-medium">
                        {analysis.step_up_auth_completed ? "Completed" : "Required"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions & Recommendations */}
          <div>
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Actions & Recommendations
            </div>
            <div className="space-y-3">
              {analysis.action_taken && analysis.action_taken !== "none" && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Action Taken</div>
                  <div className="text-sm font-medium capitalize">
                    {analysis.action_taken.replace(/_/g, " ")}
                  </div>
                </div>
              )}
              {analysis.next_best_action && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Recommended Next Action</div>
                  <div className="text-sm font-medium">{analysis.next_best_action}</div>
                </div>
              )}
              {!analysis.next_best_action && !analysis.action_taken && (
                <div className="text-sm text-muted-foreground italic">No specific actions recommended</div>
              )}
            </div>
          </div>

          {/* Analysis Metadata */}
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Analyzed at:</span>
                <span className="font-mono">
                  {new Date(analysis.analyzed_at).toLocaleString()}
                </span>
              </div>
              {analysis.provider_call_id && (
                <div className="flex items-center justify-between">
                  <span>Provider Call ID:</span>
                  <span className="font-mono text-xs">{analysis.provider_call_id}</span>
                </div>
              )}
              {analysis.vapi_call_id && (
                <div className="flex items-center justify-between">
                  <span>Vapi Call ID:</span>
                  <span className="font-mono text-xs">{analysis.vapi_call_id}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

