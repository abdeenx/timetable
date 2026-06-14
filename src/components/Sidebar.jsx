export default function Sidebar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'subjects', label: '📚 Subjects', icon: '📚' },
    { id: 'classes', label: '🏫 Classes', icon: '🏫' },
    { id: 'teachers', label: '👩‍🏫 Teachers', icon: '👩‍🏫' },
    { id: 'timetable', label: '📅 Timetable', icon: '📅' },
  ]

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="School Timetable Generator" width={44} height={44} />
      </div>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          title={tab.label}
        >
          <span className="sidebar-icon">{tab.icon}</span>
          <span className="sidebar-label">{tab.label.replace(/^.\s/, '')}</span>
        </button>
      ))}
    </nav>
  )
}
