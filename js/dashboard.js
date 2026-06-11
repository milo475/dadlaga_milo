import { supabase } from './supabase.js'
import { getUser, logout } from './auth.js'

// Auth check
const { data: { session } } = await supabase.auth.getSession()
if (!session) { window.location.href = 'index.html' }
const user = session.user
document.getElementById('userEmail').textContent = user.email
document.getElementById('logoutBtn').addEventListener('click', logout)

// Elements
const form = document.getElementById('transactionForm')
const tableBody = document.getElementById('transactionTable')
const editId = document.getElementById('editId')

// Load transactions
async function loadTransactions() {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

    if (error) { console.error(error); return }

    let income = 0, expense = 0
    tableBody.innerHTML = ''

    data.forEach(t => {
        if (t.type === 'income') income += t.amount
        else expense += t.amount

        tableBody.innerHTML += `<tr>
            <td>${t.date}</td>
            <td><span class="badge bg-${t.type === 'income' ? 'success' : 'danger'}">${t.type === 'income' ? 'Орлого' : 'Зарлага'}</span></td>
            <td>${t.category || ''}</td>
            <td>${t.description}</td>
            <td>${t.amount.toLocaleString()}₮</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="window.editTransaction('${t.id}','${t.type}',${t.amount},'${t.description}','${t.date}','${t.category || ''}')"><i class="fa fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="window.deleteTransaction('${t.id}')"><i class="fa fa-trash"></i></button>
            </td>
        </tr>`
    })

    document.getElementById('totalIncome').textContent = income.toLocaleString() + '₮'
    document.getElementById('totalExpense').textContent = expense.toLocaleString() + '₮'
    document.getElementById('totalBalance').textContent = (income - expense).toLocaleString() + '₮'
}

// Create / Update
form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const payload = {
        type: document.getElementById('type').value,
        amount: Number(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        description: document.getElementById('description').value,
        date: document.getElementById('date').value,
        user_id: user.id
    }
    console.log('user.id:', user.id, 'payload:', payload)

    if (editId.value) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', editId.value)
        if (error) { alert('Алдаа: ' + error.message); return }
        editId.value = ''
    } else {
        const { error } = await supabase.from('transactions').insert(payload)
        if (error) { alert('Алдаа: ' + error.message); return }
        awardDailyPoints()
    }

    form.reset()
    loadTransactions()
    if (payload.type === 'expense') {
        await checkBudgetWarning(payload.category, payload.date)
    }
})

// Edit
window.editTransaction = (id, type, amount, description, date, category) => {
    editId.value = id
    document.getElementById('type').value = type
    document.getElementById('amount').value = amount
    document.getElementById('category').value = category
    document.getElementById('description').value = description
    document.getElementById('date').value = date
}

// Delete
window.deleteTransaction = async (id) => {
    if (!confirm('Устгах уу?')) return
    await supabase.from('transactions').delete().eq('id', id)
    loadTransactions()
}

// Set default date to today
document.getElementById('date').valueAsDate = new Date()

// === Points / Rank System ===
function getPointsKey() { return `points_${user.id}` }
function getLastDateKey() { return `points_lastdate_${user.id}` }

function getPoints() { return Number(localStorage.getItem(getPointsKey()) || 0) }
function setPoints(p) { localStorage.setItem(getPointsKey(), p) }

function getRank(points) {
    if (points >= 600) return { name: 'Legend', icon: 'fa-solid fa-crown', color: '#ff4500' }
    if (points >= 300) return { name: 'Gold', icon: 'fa-solid fa-trophy', color: '#ffd700' }
    if (points >= 100) return { name: 'Silver', icon: 'fa-solid fa-medal', color: '#c0c0c0' }
    return { name: 'Bronze', icon: 'fa-solid fa-shield', color: '#cd7f32' }
}

function updatePointsUI() {
    const points = getPoints()
    const rank = getRank(points)
    const capped = Math.min(points, 1000)
    const percent = (capped / 1000) * 100

    document.getElementById('rankIcon').innerHTML = `<i class="${rank.icon}" style="color:${rank.color}"></i>`
    document.getElementById('rankLabel').textContent = rank.name
    document.getElementById('rankLabel').style.color = rank.color
    document.getElementById('pointsBar').style.width = percent + '%'
    document.getElementById('pointsText').textContent = `${capped} pts`
}

function awardDailyPoints() {
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = localStorage.getItem(getLastDateKey())
    if (lastDate === today) return // already awarded today
    localStorage.setItem(getLastDateKey(), today)
    setPoints(Math.min(getPoints() + 10, 1000))
    updatePointsUI()
}

updatePointsUI()

// Initial load
loadTransactions()

// Budget warning check
async function checkBudgetWarning(category, date) {
    const month = date.slice(0, 7)

    const { data: budgets, error: bErr } = await supabase
        .from('budgets')
        .select('amount, category')
        .eq('user_id', user.id)
        .eq('month', month)

    if (bErr || !budgets || budgets.length === 0) return

    // Check specific category budget
    const catBudget = budgets.find(b => b.category === category)
    if (catBudget) {
        const { data: expenses } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .eq('category', category)
            .gte('date', month + '-01')
            .lte('date', month + '-31')

        const total = expenses ? expenses.reduce((sum, e) => sum + Number(e.amount), 0) : 0
        const budgetAmt = Number(catBudget.amount)
        if (total > budgetAmt) {
            const exceeded = total - budgetAmt
            alert(`⚠️ Анхааруулга: "${category}" ангилалын төсөв ${budgetAmt.toLocaleString()}₮-г хэтэрч ${total.toLocaleString()}₮ болсон байна! (${exceeded.toLocaleString()}₮-р хэтэрсэн)`)
        }
    }
}

// Budget logic
const budgetForm = document.getElementById('budgetForm')
const budgetList = document.getElementById('budgetList')

async function loadBudgets() {
    const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false })

    if (error) { console.error(error); return }

    budgetList.innerHTML = ''
    data.forEach(b => {
        budgetList.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
            <span>${b.category} — ${b.month}</span>
            <span class="badge bg-warning text-dark">${Number(b.amount).toLocaleString()}₮</span>
        </li>`
    })
}

budgetForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const payload = {
        user_id: user.id,
        category: document.getElementById('budgetCategory').value,
        amount: Number(document.getElementById('budgetAmount').value),
        month: document.getElementById('budgetMonth').value
    }

    const { error } = await supabase.from('budgets').insert(payload)
    if (error) { alert('Алдаа: ' + error.message); return }

    budgetForm.reset()
    loadBudgets()
})

loadBudgets()
