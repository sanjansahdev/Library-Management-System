
const BOOKS_KEY = "libraryhub_books";
const LOANS_KEY = "libraryhub_loans";
const FINE_RATE = 5;
const LOAN_DAYS = 14;

const starterBooks = [
  { id: 1, title: "Python Programming", author: "John Zelle", category: "Programming" },
  { id: 2, title: "Artificial Intelligence", author: "Stuart Russell", category: "AI & ML" },
  { id: 3, title: "Database Management Systems", author: "Raghu Ramakrishnan", category: "Database" },
  { id: 4, title: "HTML and CSS", author: "Jon Duckett", category: "Web Development" },
  { id: 5, title: "Machine Learning", author: "Tom Mitchell", category: "AI & ML" },
  { id: 6, title: "JavaScript Basics", author: "Marijn Haverbeke", category: "Web Development" },
  { id: 7, title: "Data Structures", author: "Mark Allen Weiss", category: "Programming" },
  { id: 8, title: "Computer Networks", author: "Andrew Tanenbaum", category: "General" }
];

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch {
    return fallback;
  }
}

let books = loadData(BOOKS_KEY, starterBooks);
let loans = loadData(LOANS_KEY, []);
let selectedBookId = null;
let toastTimer;

const $ = id => document.getElementById(id);

function saveData() {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}

function today() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(start, end) {
  return Math.round((end - start) / 86400000);
}

function activeLoan(bookId) {
  return loans.find(loan =>
    loan.bookId === bookId && !loan.returnDate
  );
}

function getFine(loan) {
  const due = parseDate(loan.dueDate);
  const end = loan.returnDate
    ? parseDate(loan.returnDate)
    : today();

  const daysLate = Math.max(0, daysBetween(due, end));

  return {
    daysLate,
    amount: daysLate * FINE_RATE
  };
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

function makeButton(label, className, callback) {
  const button = document.createElement("button");
  button.textContent = label;
  button.className = className;
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

function makeCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.appendChild(cell);
  return cell;
}

function renderDashboard() {
  const active = loans.filter(loan => !loan.returnDate);

  $("totalBooks").textContent = books.length;
  $("availableBooks").textContent =
    books.filter(book => !activeLoan(book.id)).length;

  $("borrowedCount").textContent = active.length;

  $("overdueCount").textContent =
    active.filter(loan => getFine(loan).daysLate > 0).length;
}

function renderBooks() {
  const keyword = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const grid = $("bookGrid");
  grid.replaceChildren();

  const filtered = books.filter(book => {
    const matchesSearch = [
      book.title, book.author, book.category
    ].some(value => value.toLowerCase().includes(keyword));

    return matchesSearch &&
      (category === "all" || book.category === category);
  });

  if (!filtered.length) {
    grid.textContent = "No books found.";
    return;
  }

  filtered.forEach(book => {
    const borrowed = Boolean(activeLoan(book.id));

    const card = document.createElement("div");
    card.className = "book-card";

    const cover = document.createElement("div");
    cover.className = "book-cover";
    cover.textContent = "📘";

    const title = document.createElement("h3");
    title.textContent = book.title;

    const author = document.createElement("p");
    author.textContent = `Author: ${book.author}`;

    const categoryText = document.createElement("p");
    categoryText.textContent = `Category: ${book.category}`;

    const status = document.createElement("p");
    status.textContent = borrowed ? "🔴 Borrowed" : "🟢 Available";

    const button = makeButton(
      borrowed ? "Not Available" : "Borrow Book",
      "primary-btn",
      () => openBorrowModal(book.id)
    );
    button.disabled = borrowed;

    card.append(
      cover, title, author, categoryText, status, button
    );
    grid.appendChild(card);
  });
}

function openBorrowModal(bookId) {
  const book = books.find(item => item.id === bookId);
  if (!book || activeLoan(bookId)) return;

  selectedBookId = bookId;
  $("selectedBookName").textContent = book.title;
  $("borrowForm").reset();
  $("borrowModal").classList.remove("hidden");
}

function closeBorrowModal() {
  $("borrowModal").classList.add("hidden");
  selectedBookId = null;
}

$("closeModal").addEventListener("click", closeBorrowModal);

$("borrowModal").addEventListener("click", event => {
  if (event.target === $("borrowModal")) closeBorrowModal();
});

$("borrowForm").addEventListener("submit", event => {
  event.preventDefault();

  if (selectedBookId === null || activeLoan(selectedBookId)) return;

  const borrower = $("borrowerName").value.trim();
  const studentId = $("borrowerId").value.trim();

  if (!borrower || !studentId) return;

  const issue = today();
  const due = new Date(issue);
  due.setDate(due.getDate() + LOAN_DAYS);

  loans.push({
    id: Date.now(),
    bookId: selectedBookId,
    bookTitle: books.find(b => b.id === selectedBookId).title,
    borrower,
    studentId,
    issueDate: dateString(issue),
    dueDate: dateString(due),
    returnDate: null,
    finePaid: false
  });

  saveData();
  closeBorrowModal();
  renderAll();
  showToast("Book borrowed successfully!");
});

function returnBook(loanId) {
  const loan = loans.find(item => item.id === loanId);
  if (!loan || loan.returnDate) return;

  loan.returnDate = dateString(today());
  saveData();
  renderAll();
  showToast("Book returned successfully!");
}

function renderBorrowed() {
  const tbody = $("borrowedTable");
  tbody.replaceChildren();

  const active = loans.filter(loan => !loan.returnDate);

  if (!active.length) {
    const row = tbody.insertRow();
    const cell = makeCell(row, "No borrowed books.");
    cell.colSpan = 6;
    return;
  }

  active.forEach(loan => {
    const row = tbody.insertRow();
    const fine = getFine(loan);

    makeCell(row, loan.bookTitle);
    makeCell(row, `${loan.borrower} (${loan.studentId})`);
    makeCell(row, loan.issueDate);
    makeCell(row, loan.dueDate);
    makeCell(row, fine.daysLate > 0 ? "Overdue" : "Active");

    const action = row.insertCell();
    action.appendChild(
      makeButton("Return", "success-btn", () => returnBook(loan.id))
    );
  });
}

$("addBookForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("bookTitle").value.trim();
  const author = $("bookAuthor").value.trim();
  const category = $("bookCategory").value;

  if (!title || !author || !category) return;

  books.push({
    id: Date.now(),
    title,
    author,
    category
  });

  saveData();
  $("addBookForm").reset();
  renderAll();
  showToast("Book added to inventory!");
});

function deleteBook(bookId) {
  if (activeLoan(bookId)) {
    showToast("Return this book before deleting it.");
    return;
  }

  if (!confirm("Remove this book from inventory?")) return;

  books = books.filter(book => book.id !== bookId);
  saveData();
  renderAll();
  showToast("Book removed from inventory.");
}

function editBook(bookId) {
  const book = books.find(item => item.id === bookId);
  if (!book) return;

  const newTitle = prompt("Edit book title:", book.title);
  if (newTitle === null) return;

  const newAuthor = prompt("Edit author:", book.author);
  if (newAuthor === null) return;

  if (!newTitle.trim() || !newAuthor.trim()) {
    showToast("Title and author cannot be empty.");
    return;
  }

  book.title = newTitle.trim();
  book.author = newAuthor.trim();

  loans.forEach(loan => {
    if (loan.bookId === bookId) loan.bookTitle = book.title;
  });

  saveData();
  renderAll();
  showToast("Book updated successfully!");
}

function renderInventory() {
  const tbody = $("inventoryTable");
  tbody.replaceChildren();

  books.forEach(book => {
    const row = tbody.insertRow();

    makeCell(row, book.title);
    makeCell(row, book.author);
    makeCell(row, book.category);
    makeCell(row, activeLoan(book.id) ? "Borrowed" : "Available");

    const action = row.insertCell();
    action.append(
      makeButton("Edit", "action-btn", () => editBook(book.id)),
      document.createTextNode(" "),
      makeButton("Delete", "danger-btn", () => deleteBook(book.id))
    );
  });
}

function renderNotifications() {
  const container = $("notificationList");
  container.replaceChildren();

  const active = loans.filter(loan => !loan.returnDate);
  let count = 0;

  active.forEach(loan => {
    const remaining = daysBetween(today(), parseDate(loan.dueDate));
    let message = "";
    let type = "";

    if (remaining < 0) {
      message = `⚠️ ${loan.borrower}: "${loan.bookTitle}" is ${-remaining} day(s) overdue.`;
      type = "danger";
    } else if (remaining <= 3) {
      message = `🔔 ${loan.borrower}: "${loan.bookTitle}" is due in ${remaining} day(s).`;
      type = "warning";
    }

    if (message) {
      const item = document.createElement("div");
      item.className = `notification-item ${type}`;
      item.textContent = message;
      container.appendChild(item);
      count++;
    }
  });

  if (!count) {
    const item = document.createElement("div");
    item.className = "notification-item";
    item.textContent = "✅ No due-date alerts right now.";
    container.appendChild(item);
  }
}

function payFine(loanId) {
  const loan = loans.find(item => item.id === loanId);
  if (!loan || !loan.returnDate || getFine(loan).amount === 0) return;

  loan.finePaid = true;
  saveData();
  renderAll();
  showToast("Fine marked as paid (demo only).");
}

function renderFines() {
  const tbody = $("fineTable");
  tbody.replaceChildren();

  let outstanding = 0;
  let fineCount = 0;

  loans.forEach(loan => {
    const fine = getFine(loan);
    if (fine.amount === 0) return;

    fineCount++;

    if (!loan.finePaid) outstanding += fine.amount;

    const row = tbody.insertRow();

    makeCell(row, loan.borrower);
    makeCell(row, loan.bookTitle);
    makeCell(row, fine.daysLate);
    makeCell(row, `₹${fine.amount}`);
    makeCell(row, loan.finePaid ? "Paid" : "Unpaid");

    const action = row.insertCell();

    if (loan.finePaid) {
      action.textContent = "Completed";
    } else if (!loan.returnDate) {
      action.textContent = "Return book first";
    } else {
      action.appendChild(
        makeButton("Mark Paid", "success-btn", () => payFine(loan.id))
      );
    }
  });

  if (!fineCount) {
    const row = tbody.insertRow();
    const cell = makeCell(row, "No overdue fines.");
    cell.colSpan = 6;
  }

  $("totalFines").textContent = `₹${outstanding}`;
}

function renderAll() {
  renderDashboard();
  renderBooks();
  renderBorrowed();
  renderInventory();
  renderNotifications();
  renderFines();
}

$("searchInput").addEventListener("input", renderBooks);
$("categoryFilter").addEventListener("change", renderBooks);

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item => {
      item.classList.remove("active");
    });
    link.classList.add("active");
  });
});

renderAll();
