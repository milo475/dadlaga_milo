import { supabase } from './supabase.js'

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
        showMessage('Алдаа: ' + error.message, 'text-danger')
        return null
    }
    showMessage('Амжилттай нэвтэрлээ!', 'text-success')
    setTimeout(() => { window.location.href = 'dashboard.html' }, 1500)
    return data
}

export async function register(email, password, fullName, phone) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } }
    })
    if (error) {
        showMessage('Алдаа: ' + error.message, 'text-danger')
        return null
    }
    showMessage('Бүртгэл амжилттай! Email-ээ шалгаарай.', 'text-success')
    return data
}

export async function logout() {
    await supabase.auth.signOut()
    window.location.href = 'index.html'
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export function showMessage(msg, cssClass) {
    const el = document.getElementById('message')
    if (!el) return
    el.textContent = msg
    el.className = cssClass
}
