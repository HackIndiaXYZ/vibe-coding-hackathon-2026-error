import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Activity, Users, MonitorPlay, Clock, LayoutDashboard, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-accent" />
          <span className="font-serif text-2xl tracking-tight">QueueCare</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/reception" className="text-sm font-medium hover:text-accent transition-colors">
            Login
          </Link>
          <Link
            href="/reception"
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-24 pb-32 px-6">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-serif text-6xl md:text-8xl leading-[1.1] tracking-tight"
            >
              Stop Making Patients <br /> Wait Blindly.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-xl md:text-2xl text-foreground/70 max-w-2xl mx-auto font-light leading-relaxed"
            >
              AI-powered clinic queue management that predicts wait times and modernizes patient flow.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center justify-center gap-4 pt-8"
            >
              <Link
                href="/reception"
                className="px-8 py-4 rounded-full bg-primary text-primary-foreground text-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                className="px-8 py-4 rounded-full bg-accent text-accent-foreground text-lg font-medium hover:bg-accent/90 transition-colors"
              >
                Watch Demo
              </button>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 space-y-32">
            
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-full bg-[#e5efe5] flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#2c5234]" />
                </div>
                <h2 className="font-serif text-4xl md:text-5xl tracking-tight">Smart Token Management</h2>
                <p className="text-lg text-foreground/70 leading-relaxed">
                  Streamline the registration process. Generate tokens instantly with just a name and phone number. Patients are seamlessly added to the digital queue.
                </p>
              </div>
              <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-[#e5efe5] to-[#c8e0c8] p-8 flex items-center justify-center">
                <div className="w-full h-full bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-16 items-center md:flex-row-reverse">
              <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-[#e5eaff] to-[#c8d4ff] p-8 flex items-center justify-center order-2 md:order-1">
                 <div className="w-full h-full bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm" />
              </div>
              <div className="space-y-6 order-1 md:order-2">
                <div className="w-12 h-12 rounded-full bg-[#e5eaff] flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#2a3c8c]" />
                </div>
                <h2 className="font-serif text-4xl md:text-5xl tracking-tight">AI Wait Prediction</h2>
                <p className="text-lg text-foreground/70 leading-relaxed">
                  No more guessing. Our AI analyzes historical consultation times and current queue health to provide highly accurate wait time predictions for every patient.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-full bg-[#fef5e7] flex items-center justify-center">
                  <MonitorPlay className="w-6 h-6 text-[#b58539]" />
                </div>
                <h2 className="font-serif text-4xl md:text-5xl tracking-tight">Live Queue Tracking</h2>
                <p className="text-lg text-foreground/70 leading-relaxed">
                  Display the queue status clearly in your waiting room. Keep patients informed and calm with a beautiful, easy-to-read interface.
                </p>
              </div>
              <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-[#fef5e7] to-[#fce3ba] p-8 flex items-center justify-center">
                <div className="w-full h-full bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm" />
              </div>
            </div>

          </div>
        </section>

      </main>

      <footer className="py-12 border-t border-border mt-24">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-accent" />
            <span className="font-serif text-xl tracking-tight">QueueCare</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 QueueCare AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
