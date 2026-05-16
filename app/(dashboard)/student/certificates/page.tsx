"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, Download, Share2, ExternalLink, Rocket, Trophy, Star, Sparkles } from "lucide-react"

interface Certificate {
  id: string
  course_title: string
  course_id: string
  issued_at: string
  certificate_url?: string
}

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCertificates() {
      try {
        const res = await fetch("/api/student/certificates")
        if (res.ok) {
          const data = await res.json()
          setCertificates(data)
        }
      } catch (error) {
        console.error("Failed to fetch certificates:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCertificates()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Rocket className="h-12 w-12 text-emerald-500" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">My Certificates</h1>
          <p className="text-gray-500">Your achievements and accomplishments!</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div 
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-2"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Trophy className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-amber-600">
              {certificates.length} Earned
            </span>
          </motion.div>
        </div>
      </div>

      {certificates.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert, index) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: index * 0.15, type: "spring" }}
            >
              <Card className="group relative h-full overflow-hidden border-0 bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl">
                {/* Decorative Elements */}
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-200/30 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-yellow-200/30 blur-2xl" />
                
                <CardContent className="relative p-6">
                  {/* Certificate Icon */}
                  <div className="mb-6 flex justify-center">
                    <motion.div 
                      className="relative"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30">
                        <Award className="h-12 w-12 text-white" />
                      </div>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute -right-2 -top-2"
                      >
                        <Sparkles className="h-6 w-6 text-amber-400" />
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Certificate Details */}
                  <div className="text-center">
                    <div className="mb-2 flex items-center justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <h3 className="mb-2 text-lg font-extrabold text-gray-800">
                      Certificate of Completion
                    </h3>
                    <p className="mb-1 text-sm font-medium text-violet-600">{cert.course_title}</p>
                    <p className="mb-6 text-xs text-gray-500">
                      Issued on {new Date(cert.issued_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Link href={`/certificates/${cert.id}`}>
                        <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 font-semibold text-white hover:from-amber-600 hover:to-yellow-600">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Certificate
                        </Button>
                      </Link>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 border-amber-200 text-amber-600 hover:bg-amber-50">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button variant="outline" className="flex-1 border-amber-200 text-amber-600 hover:bg-amber-50">
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <motion.div 
            className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-yellow-100"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Award className="h-16 w-16 text-amber-400" />
          </motion.div>
          <h3 className="mb-2 text-2xl font-extrabold text-gray-800">No certificates yet!</h3>
          <p className="mb-6 max-w-md text-gray-500">
            Complete courses to earn certificates. Each certificate proves your hard work and dedication!
          </p>
          <Link href="/student/courses">
            <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 font-semibold">
              <Trophy className="mr-2 h-5 w-5" />
              Start Learning to Earn Certificates
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  )
}
