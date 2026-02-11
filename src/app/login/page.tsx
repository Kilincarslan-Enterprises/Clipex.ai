'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const supabase = createClient()
    const router = useRouter()
    const [host, setHost] = useState('')

    useEffect(() => {
        console.log('LoginPage mounted, setting host...')
        setHost(window.location.origin)

        // Check current session immediately
        const checkUser = async () => {
            console.log('Checking for existing session...')
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                console.log('Session found, redirecting...', user.email)
                router.push('/')
            } else {
                console.log('No active session found.')
            }
        }
        checkUser()

        console.log('Setting up onAuthStateChange listener...')
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change event detected:', event)
            if (session) {
                console.log('Session exists for user:', session.user.email)
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    console.log('Valid login event, navigating to dashboard...')
                    router.push('/')
                    router.refresh()
                }
            } else {
                console.log('No session in auth state change.')
            }
        })

        return () => {
            console.log('LoginPage unmounting, cleaning up listener.')
            subscription.unsubscribe()
        }
    }, [supabase, router])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4">
            <div className="w-full max-w-md space-y-8 rounded-lg border border-neutral-800 bg-neutral-900 p-8 shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                    <p className="mt-2 text-neutral-400">Sign in to your account</p>
                </div>

                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: '#2563eb', // blue-600
                                    brandAccent: '#1d4ed8', // blue-700
                                    inputText: 'white',
                                    inputBackground: '#171717', // neutral-900
                                    inputBorder: '#404040', // neutral-700
                                    inputLabelText: '#a3a3a3', // neutral-400
                                }
                            }
                        },
                        className: {
                            container: 'w-full',
                            button: 'w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors',
                            input: 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white focus:outline-none focus:border-blue-500',
                            label: 'block text-sm font-medium text-neutral-400 mb-1',
                        }
                    }}
                    providers={['github', 'google']}
                    redirectTo={`${host}/auth/callback`}
                    theme="dark"
                />
            </div>
        </div>
    )
}
