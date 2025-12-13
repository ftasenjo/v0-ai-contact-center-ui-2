"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  ExternalLink,
  TrendingUp,
  ThumbsUp,
  Eye,
  Edit,
  MoreVertical,
  FileText,
  LinkIcon,
  Video,
  Upload,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

const knowledgeArticles = [
  {
    id: "kb-001",
    title: "How to Reset Customer Passwords",
    category: "Account Management",
    views: 1247,
    helpful: 234,
    lastUpdated: "2 days ago",
    author: "Sarah Chen",
    type: "article",
    aiSuggested: 89,
  },
  {
    id: "kb-002",
    title: "Billing Dispute Resolution Process",
    category: "Billing",
    views: 892,
    helpful: 178,
    lastUpdated: "1 week ago",
    author: "David Park",
    type: "article",
    aiSuggested: 156,
  },
  {
    id: "kb-003",
    title: "Enterprise SLA Compensation Policy",
    category: "Enterprise",
    views: 456,
    helpful: 89,
    lastUpdated: "3 days ago",
    author: "Maria Garcia",
    type: "article",
    aiSuggested: 67,
  },
  {
    id: "kb-004",
    title: "API Integration Troubleshooting",
    category: "Technical",
    views: 2134,
    helpful: 412,
    lastUpdated: "5 days ago",
    author: "Alex Thompson",
    type: "article",
    aiSuggested: 234,
  },
  {
    id: "kb-005",
    title: "Product Demo Walkthrough",
    category: "Sales",
    views: 678,
    helpful: 123,
    lastUpdated: "1 day ago",
    author: "Sarah Chen",
    type: "video",
    aiSuggested: 45,
  },
  {
    id: "kb-006",
    title: "Cancellation and Refund Guidelines",
    category: "Billing",
    views: 1523,
    helpful: 298,
    lastUpdated: "4 days ago",
    author: "David Park",
    type: "article",
    aiSuggested: 189,
  },
]

const categories = [
  { name: "All", count: knowledgeArticles.length },
  { name: "Account Management", count: 12 },
  { name: "Billing", count: 8 },
  { name: "Technical", count: 15 },
  { name: "Enterprise", count: 6 },
  { name: "Sales", count: 9 },
]

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredArticles = knowledgeArticles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex h-full">
      {/* Sidebar - Categories */}
      <div className="w-64 border-r border-border bg-card p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-3">Categories</h3>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === category.name
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{category.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Total Views</span>
                <span className="text-sm font-semibold">8.2k</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">AI Suggestions</span>
                <span className="text-sm font-semibold">1.4k</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-emerald-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Helpful Rate</span>
                <span className="text-sm font-semibold">94%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[94%] bg-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Knowledge Base</h1>
              <p className="text-muted-foreground">Manage support articles and AI training content</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Knowledge Article</DialogTitle>
                  <DialogDescription>Add a new article to help agents and train AI</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Article Title</Label>
                    <Input id="title" placeholder="e.g., How to process refunds" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" placeholder="e.g., Billing" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea id="content" placeholder="Write your article content here..." className="min-h-[200px]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <Video className="h-4 w-4 mr-2" />
                      Add Video
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(false)}>Create Article</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {article.type === "video" ? (
                            <Video className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {article.category}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mb-1">{article.title}</CardTitle>
                        <CardDescription className="text-xs">
                          By {article.author} • {article.lastUpdated}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Public
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">Views</span>
                        </div>
                        <p className="font-semibold">{article.views.toLocaleString()}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span className="text-xs">Helpful</span>
                        </div>
                        <p className="font-semibold">{article.helpful}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">AI Used</span>
                        </div>
                        <p className="font-semibold">{article.aiSuggested}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
