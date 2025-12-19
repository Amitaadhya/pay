import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // Set Firebase debug log level
        setLogLevel('Debug');

        // Global variables provided by the environment
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);

        // UI elements
        const totalSalaryEl = document.getElementById('totalSalary');
        const totalPendingEl = document.getElementById('totalPending');
        const totalSavingsEl = document.getElementById('totalSavings');
        const totalInvestmentEl = document.getElementById('totalInvestment');
        const totalExpenseEl = document.getElementById('totalExpense');
        const balanceEl = document.getElementById('balance');
        const entriesTableBody = document.getElementById('entriesTableBody');
        const entryForm = document.getElementById('entryForm');
        const submitBtn = document.getElementById('submitBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const confirmationSection = document.getElementById('confirmationSection');
        const confirmationDetails = document.getElementById('confirmationDetails');
        const confirmBtn = document.getElementById('confirmBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const userIdDisplay = document.getElementById('userIdDisplay');
        const loadingEl = document.getElementById('loading');
        const percentageInputDiv = document.getElementById('percentageInputDiv');
        const amountInput = document.getElementById('amount');
        const percentageInput = document.getElementById('percentage');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        const viewModal = document.getElementById('viewModal');
        const viewDetails = document.getElementById('viewDetails');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const expenseChartEl = document.getElementById('expenseChart');

        // State variables
        let userId = null;
        let pendingEntry = null;
        let currentTotalSalary = 0;
        let allEntries = [];
        let editingDocId = null;
        let expenseChart = null;

        // Function to format amount to INR currency
        const formatAmount = (amount) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
            }).format(amount);
        };

        // Function to update the summary totals
        const updateSummary = (records) => {
            let totalSalary = 0;
            let totalPending = 0;
            let totalSavings = 0;
            let totalInvestment = 0;
            let totalExpense = 0;

            records.forEach(entry => {
                const amount = parseFloat(entry.amount);
                switch (entry.entryType) {
                    case 'Salary':
                        totalSalary += amount;
                        break;
                    case 'Pending':
                        totalPending += amount;
                        break;
                    case 'Savings':
                        totalSavings += amount;
                        break;
                    case 'Investment':
                        totalInvestment += amount;
                        break;
                    case 'Expense':
                        totalExpense += amount;
                        break;
                }
            });

            currentTotalSalary = totalSalary;
            const balance = totalSalary - totalPending - totalSavings - totalInvestment - totalExpense;

            totalSalaryEl.textContent = formatAmount(totalSalary);
            totalPendingEl.textContent = formatAmount(totalPending);
            totalSavingsEl.textContent = formatAmount(totalSavings);
            totalInvestmentEl.textContent = formatAmount(totalInvestment);
            totalExpenseEl.textContent = formatAmount(totalExpense);
            balanceEl.textContent = formatAmount(balance);

            updateChart(totalPending, totalSavings, totalInvestment, totalExpense);
        };

        // Function to update the chart
        const updateChart = (pending, savings, investment, expense) => {
            const chartData = {
                labels: ['Pending', 'Savings', 'Investment', 'Expense'],
                datasets: [{
                    label: 'Expense Breakdown',
                    data: [pending, savings, investment, expense],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                    ],
                    borderWidth: 1,
                }]
            };

            if (expenseChart) {
                expenseChart.data = chartData;
                expenseChart.update();
            } else {
                expenseChart = new Chart(expenseChartEl, {
                    type: 'doughnut',
                    data: chartData,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed !== null) {
                                            label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed);
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    },
                });
            }
        };

        // Function to render entries to the table
        const renderEntries = (entries) => {
            entriesTableBody.innerHTML = '';
            entries.sort((a, b) => new Date(b.date) - new Date(a.date));
            allEntries = entries; // Update the global array

            entries.forEach(entry => {
                const row = document.createElement('tr');
                row.classList.add('border-b', 'border-gray-200', 'hover:bg-gray-50');

                let typeColor;
                switch (entry.entryType) {
                    case 'Salary': typeColor = 'text-green-600'; break;
                    case 'Pending': typeColor = 'text-red-600'; break;
                    case 'Savings': typeColor = 'text-yellow-600'; break;
                    case 'Investment': typeColor = 'text-indigo-600'; break;
                    case 'Expense': typeColor = 'text-gray-600'; break;
                    default: typeColor = 'text-gray-600';
                }

                row.innerHTML = `
                    <td class="py-3 px-6 whitespace-nowrap">
                        <span class="font-medium ${typeColor}">${entry.entryType}</span>
                    </td>
                    <td class="py-3 px-6 whitespace-nowrap font-semibold">${formatAmount(entry.amount)}</td>
                    <td class="py-3 px-6 whitespace-nowrap">${entry.date}</td>
                    <td class="py-3 px-6">${entry.description}</td>
                    <td class="py-3 px-6 text-center space-x-2">
                        <button data-doc-id="${entry.id}" class="view-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-sm">View</button>
                        <button data-doc-id="${entry.id}" class="edit-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-sm">Edit</button>
                        <button data-doc-id="${entry.id}" class="delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow-sm">Delete</button>
                    </td>
                `;
                entriesTableBody.appendChild(row);
            });
        };

        // Function to delete an entry
        const deleteEntry = async (docId) => {
            if (!userId) {
                console.error("User not authenticated. Cannot delete entry.");
                return;
            }
            try {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/financial_records`, docId);
                await deleteDoc(docRef);
                console.log("Document successfully deleted!");
            } catch (error) {
                console.error("Error removing document: ", error);
            }
        };

        // Function to export data to CSV
        const exportToCsv = () => {
            if (allEntries.length === 0) {
                console.log("No data to export.");
                return;
            }

            const headers = ["Type", "Amount", "Date", "Description"];
            const rows = allEntries.map(entry => [
                entry.entryType,
                entry.amount,
                entry.date,
                `"${entry.description.replace(/"/g, '""')}"`
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'financial_entries.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // Function to fill the form for editing
        const editEntry = (entry) => {
            editingDocId = entry.id;
            entryForm.description.value = entry.description;
            entryForm.date.value = entry.date;
            entryForm.amount.value = entry.amount;

            document.querySelectorAll('input[name="entryType"]').forEach(radio => {
                if (radio.value === entry.entryType) {
                    radio.checked = true;
                }
            });

            if (entry.entryType === 'Savings' || entry.entryType === 'Investment') {
                 percentageInputDiv.classList.remove('hidden');
                 amountInput.disabled = true;
                 const percentage = (entry.amount / currentTotalSalary) * 100;
                 percentageInput.value = isNaN(percentage) ? 0 : percentage.toFixed(2);
            } else {
                 percentageInputDiv.classList.add('hidden');
                 amountInput.disabled = false;
                 percentageInput.value = '';
            }

            submitBtn.textContent = 'Save Changes';
            cancelEditBtn.classList.remove('hidden');
        };

        // Function to reset the form
        const resetForm = () => {
            entryForm.reset();
            submitBtn.textContent = 'Add Entry';
            cancelEditBtn.classList.add('hidden');
            editingDocId = null;
        };

        // Authenticate and set up Firestore listener
        onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    userId = user.uid;
                    userIdDisplay.textContent = userId;
                    loadingEl.classList.add('hidden');

                    const financialRecordsCol = collection(db, `artifacts/${appId}/users/${userId}/financial_records`);

                    onSnapshot(financialRecordsCol, (snapshot) => {
                        const records = [];
                        snapshot.forEach(doc => records.push({ ...doc.data(), id: doc.id }));
                        updateSummary(records);
                        renderEntries(records);
                    });
                } else {
                    // Sign in with custom token or anonymously
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                }
            } catch (error) {
                console.error("Authentication or Firestore setup error:", error);
                userIdDisplay.textContent = 'Auth Error';
                loadingEl.classList.add('hidden');
            }
        });

        // Handle form submission
        entryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const form = e.target;
            const description = form.description.value;
            const date = form.date.value;
            const entryType = form.entryType.value;
            let amount;

            if (percentageInputDiv.classList.contains('hidden')) {
                amount = parseFloat(form.amount.value);
            } else {
                const percentage = parseFloat(form.percentage.value);
                amount = (currentTotalSalary * percentage) / 100;
                if (isNaN(amount)) {
                    amount = 0;
                }
            }

            const entryData = {
                entryType,
                amount: amount,
                currency: '₹',
                date,
                description,
                timestamp: serverTimestamp()
            };

            if (editingDocId) {
                try {
                    const docRef = doc(db, `artifacts/${appId}/users/${userId}/financial_records`, editingDocId);
                    await updateDoc(docRef, entryData);
                    console.log("Document successfully updated!");
                    resetForm();
                } catch (e) {
                    console.error("Error updating document: ", e);
                }
            } else {
                // Confirmation logic for new entry
                pendingEntry = entryData;
                confirmationDetails.innerHTML = `
                    <p><strong>Type:</strong> ${pendingEntry.entryType}</p>
                    <p><strong>Amount:</strong> ${formatAmount(pendingEntry.amount)}</p>
                    <p><strong>Date:</strong> ${pendingEntry.date}</p>
                    <p><strong>Description:</strong> ${pendingEntry.description}</p>
                `;
                confirmationSection.classList.remove('hidden');
            }
        });

        // Handle confirmation button click
        confirmBtn.addEventListener('click', async () => {
            if (!pendingEntry) return;

            try {
                if (userId) {
                    const financialRecordsCol = collection(db, `artifacts/${appId}/users/${userId}/financial_records`);
                    await addDoc(financialRecordsCol, pendingEntry);

                    // Clear the form and hide confirmation
                    entryForm.reset();
                    pendingEntry = null;
                    confirmationSection.classList.add('hidden');
                } else {
                    console.error("User not authenticated. Cannot save entry.");
                }
            } catch (e) {
                console.error("Error adding document: ", e);
            }
        });

        // Handle cancel button click
        cancelBtn.addEventListener('click', () => {
            pendingEntry = null;
            confirmationSection.classList.add('hidden');
        });

        // Event listeners for actions on the table
        entriesTableBody.addEventListener('click', (e) => {
            const docId = e.target.dataset.docId;
            const entry = allEntries.find(ent => ent.id === docId);
            if (!entry) return;

            if (e.target.classList.contains('delete-btn')) {
                deleteEntry(docId);
            } else if (e.target.classList.contains('view-btn')) {
                viewDetails.innerHTML = `
                    <p><strong>Type:</strong> ${entry.entryType}</p>
                    <p><strong>Amount:</strong> ${formatAmount(entry.amount)}</p>
                    <p><strong>Date:</strong> ${entry.date}</p>
                    <p><strong>Description:</strong> ${entry.description}</p>
                `;
                viewModal.style.display = 'block';
            } else if (e.target.classList.contains('edit-btn')) {
                editEntry(entry);
            }
        });

        // Event listener for cancel edit button
        cancelEditBtn.addEventListener('click', resetForm);

        // Event listener for export button
        exportCsvBtn.addEventListener('click', exportToCsv);

        // Event listener for modal close button
        closeModalBtn.addEventListener('click', () => {
            viewModal.style.display = 'none';
        });

        // Close modal when clicking outside of it
        window.addEventListener('click', (event) => {
            if (event.target == viewModal) {
                viewModal.style.display = 'none';
            }
        });

        // Set default date to today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

        // Show/hide percentage input based on entry type
        document.querySelectorAll('input[name="entryType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'Savings' || e.target.value === 'Investment') {
                    percentageInputDiv.classList.remove('hidden');
                    amountInput.disabled = true;
                    if (editingDocId) {
                         const percentage = (amountInput.value / currentTotalSalary) * 100;
                         percentageInput.value = isNaN(percentage) ? 0 : percentage.toFixed(2);
                    }
                } else {
                    percentageInputDiv.classList.add('hidden');
                    amountInput.disabled = false;
                    percentageInput.value = '';
                }
            });
        });