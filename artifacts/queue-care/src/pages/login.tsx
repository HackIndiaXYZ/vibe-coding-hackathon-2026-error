import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Phone, 
  Building2, 
  User, 
  Stethoscope, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Schema for Phone Number
const phoneSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit mobile number"),
});

// Schema for Clinic Details
const clinicSchema = z.object({
  clinicName: z.string().min(2, "Clinic name must be at least 2 characters"),
  doctorName: z.string().min(2, "Doctor name must be at least 2 characters"),
  specialization: z.string().min(1, "Please select a specialization"),
  customSpecialization: z.string().optional(),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch current settings to check if clinic is already registered or prefill details
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();

  // Step states: 'phone' | 'details'
  const [step, setStep] = useState<'phone' | 'details'>('phone');
  const [mobileNumber, setMobileNumber] = useState("");

  // If already authenticated, redirect straight to reception
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("queue_care_authenticated") === "true";
    if (isAuthenticated) {
      setLocation("/reception");
    }
  }, [setLocation]);

  // Forms
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const clinicForm = useForm<z.infer<typeof clinicSchema>>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      clinicName: "",
      doctorName: "",
      specialization: "",
      customSpecialization: "",
    },
  });

  // Prefill clinic settings if they exist when we arrive at the details step
  useEffect(() => {
    if (settings && step === 'details') {
      const knownSpecs = ["General Physician", "Dentist", "Pediatrician", "Dermatologist", "Gynecologist"];
      const isKnown = knownSpecs.includes(settings.specialization || "");
      
      clinicForm.reset({
        clinicName: settings.clinicName === "QueueCare Clinic" ? "" : settings.clinicName,
        doctorName: settings.doctorName === "Dr. Aisha Patel" ? "" : settings.doctorName,
        specialization: isKnown ? settings.specialization : (settings.specialization ? "other" : ""),
        customSpecialization: isKnown ? "" : (settings.specialization || ""),
      });
    }
  }, [settings, step, clinicForm]);

  // Handle phone submission (move to Details)
  function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
    setMobileNumber(values.phone);
    setStep('details');
    toast({
      title: "Phone Submitted",
      description: "Please configure or confirm your clinic details.",
    });
  }

  // Handle registration submit (saves to API & updates state)
  function onClinicSubmit(values: z.infer<typeof clinicSchema>) {
    const finalSpecialization = 
      values.specialization === "other" 
        ? (values.customSpecialization || "General Medicine")
        : values.specialization;

    const payload = {
      clinicName: values.clinicName,
      doctorName: values.doctorName,
      specialization: finalSpecialization,
    };

    updateSettings.mutate({ data: payload }, {
      onSuccess: () => {
        // Mark as authenticated in browser
        localStorage.setItem("queue_care_authenticated", "true");
        localStorage.setItem("queue_care_logged_in_phone", mobileNumber);
        
        toast({
          title: "Registration Complete",
          description: `Welcome, ${values.doctorName}! Your clinic details have been set.`,
        });

        // Invalidate settings query cache so navbar/header picks it up
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });

        // Redirect to Reception page
        setLocation("/reception");
      },
      onError: (err) => {
        toast({
          title: "Error saving details",
          description: err.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  const selectedSpecialization = clinicForm.watch("specialization");

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Dynamic background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-lg z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-accent animate-pulse" />
            <span className="font-serif text-3xl tracking-tight">QueueCare</span>
          </div>
          <p className="text-muted-foreground text-sm font-light">AI-Powered Clinic & Waitlist Intelligence</p>
        </div>

        <Card className="rounded-[2rem] border-border shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="pt-8 px-8 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="font-serif text-3xl">
                  {step === 'phone' && "Welcome Doctor"}
                  {step === 'details' && "Clinic Registration"}
                </CardTitle>
                <CardDescription className="mt-2 text-sm">
                  {step === 'phone' && "Enter your mobile number to get started with QueueCare"}
                  {step === 'details' && "Configure your clinic identity & doctor details"}
                </CardDescription>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center text-accent">
                {step === 'phone' ? <Phone className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              </div>
            </div>
            {/* Progress indicators */}
            <div className="flex gap-2 pt-6">
              <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step === 'phone' ? 'bg-accent' : 'bg-accent/40'}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step === 'details' ? 'bg-accent' : 'bg-muted'}`} />
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {/* STEP 1: Phone Login */}
              {step === 'phone' && (
                <motion.div
                  key="phone-step"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                      <FormField
                        control={phoneForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile Number</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <span className="absolute left-4 text-sm text-muted-foreground font-medium border-r pr-3 border-border">+91</span>
                                <Input 
                                  placeholder="9876543210" 
                                  className="pl-16 h-12 rounded-xl bg-muted/30 border-border focus-visible:ring-accent/30 focus-visible:border-accent text-base tracking-wide" 
                                  maxLength={10}
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-12 rounded-full mt-2 font-medium flex items-center justify-center gap-2 group cursor-pointer">
                        Continue
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* STEP 2: Clinic details */}
              {step === 'details' && (
                <motion.div
                  key="details-step"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Form {...clinicForm}>
                    <form onSubmit={clinicForm.handleSubmit(onClinicSubmit)} className="space-y-4">
                      {/* Clinic Name */}
                      <FormField
                        control={clinicForm.control}
                        name="clinicName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clinic Name</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <Building2 className="absolute left-4 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Metro Dental Clinic" className="pl-12 h-12 rounded-xl bg-muted/30 border-border focus-visible:ring-accent/30 focus-visible:border-accent" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Doctor Name */}
                      <FormField
                        control={clinicForm.control}
                        name="doctorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Doctor Name</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <User className="absolute left-4 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Dr. Sarah Jenkins" className="pl-12 h-12 rounded-xl bg-muted/30 border-border focus-visible:ring-accent/30 focus-visible:border-accent" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Specialization select */}
                      <FormField
                        control={clinicForm.control}
                        name="specialization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specialization</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border focus:ring-accent/30 focus:border-accent">
                                  <div className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Select Specialization" />
                                  </div>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="General Physician">General Physician</SelectItem>
                                <SelectItem value="Dentist">Dentist</SelectItem>
                                <SelectItem value="Pediatrician">Pediatrician</SelectItem>
                                <SelectItem value="Dermatologist">Dermatologist</SelectItem>
                                <SelectItem value="Gynecologist">Gynecologist</SelectItem>
                                <SelectItem value="other">Other / Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Custom Specialization Field if "other" selected */}
                      {selectedSpecialization === "other" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-1"
                        >
                          <FormField
                            control={clinicForm.control}
                            name="customSpecialization"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Specify Specialization</FormLabel>
                                <FormControl>
                                  <Input placeholder="Cardiologist, Orthopedist, etc." className="h-11 rounded-xl bg-muted/30 border-border focus-visible:ring-accent/30 focus-visible:border-accent" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      <div className="flex justify-between items-center text-sm pt-2 px-1">
                        <button 
                          type="button" 
                          onClick={() => setStep('phone')} 
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
                        >
                          <ArrowLeft className="h-4 w-4" /> Back to Phone
                        </button>
                      </div>

                      <Button type="submit" disabled={updateSettings.isPending} className="w-full h-12 rounded-full mt-4 font-medium flex items-center justify-center gap-2 cursor-pointer">
                        {updateSettings.isPending ? (
                          "Registering Clinic..."
                        ) : (
                          <>
                            Complete Registration
                            <CheckCircle className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
