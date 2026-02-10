'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function LoginPage() {
    const supabase = createClient()
    const [host, setHost] = useState('')

    useEffect(() => {
        setHost(window.location.origin)
    }, [])

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
