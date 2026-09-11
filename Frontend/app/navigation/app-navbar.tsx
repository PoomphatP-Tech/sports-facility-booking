import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import { authService } from "~/services/auth.service";
import { APP_BRAND_NAME } from "~/constants/app.constants";
import { useAuth } from "~/auth/auth-middleware";
import NotificationBell from "~/nofication/notification";
import profileIcon from "~/image/profile.png";
import "./app-navbar.css";

const partnerLinks = [
  { to: "/find-partners", label: "Find Partners" },
  { to: "/partner-requests", label: "Partner Requests" },
  { to: "/my-partner-profile", label: "My Partner Profile" },
];

export default function AppNavbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isMember = user?.role === "member";

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  const isActive = (to: string) => pathname === to || (to === "/admin"
    ? pathname.startsWith("/admin/facility/")
    : to !== "/" && pathname.startsWith(`${to}/`));

  const mainLinks = isAdmin ? [
    { to: "/admin", label: "Facilities" },
    { to: "/admin/staff", label: "Staff" },
    { to: "/admin/accounts", label: "Admins" },
  ] : isStaff ? [
    { to: "/staff/pending", label: "Staff Dashboard" },
    { to: "/staff/upcoming", label: "Manage Sessions" },
    { to: "/equipment-reports-admin", label: "Equipment Admin" },
  ] : isMember ? [
    { to: "/", label: "Home" },
    { to: "/facilities/map", label: "Map" },
    { to: "/booking/my", label: "My Bookings" },
  ] : [];

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      navigate("/auth/login");
    }
  };

  return (
    <Navbar
      expand="xl"
      className="app-navbar"
      sticky="top"
      expanded={expanded}
      onToggle={setExpanded}
      collapseOnSelect
      aria-label="Main navigation"
    >
      <Container fluid className="app-navbar__container">
        <Navbar.Brand as={Link} to="/" className="app-navbar__brand">
          {APP_BRAND_NAME}
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="global-navbar" aria-expanded={expanded} aria-label="Toggle navigation" />

        <Navbar.Collapse id="global-navbar">
          <Nav className="app-navbar__links">
            {mainLinks.map(({ to, label }) => (
              <Nav.Link
                key={to}
                as={Link}
                to={to}
                eventKey={to}
                active={isActive(to)}
                aria-current={pathname === to ? "page" : undefined}
              >
                {label}
              </Nav.Link>
            ))}

            {isMember && (
              <>
                <NavDropdown
                  title="Partners"
                  id="partners-menu"
                  active={partnerLinks.some(({ to }) => isActive(to))}
                >
                  {partnerLinks.map(({ to, label }) => (
                    <NavDropdown.Item
                      key={to}
                      as={Link}
                      to={to}
                      eventKey={to}
                      active={isActive(to)}
                      aria-current={pathname === to ? "page" : undefined}
                    >
                      {label}
                    </NavDropdown.Item>
                  ))}
                </NavDropdown>
                <Nav.Link
                  as={Link}
                  to="/equipment-reports"
                  eventKey="/equipment-reports"
                  active={isActive("/equipment-reports")}
                  aria-current={pathname === "/equipment-reports" ? "page" : undefined}
                >
                  Equipment Reports
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="app-navbar__account-links">
            {isMember && <NotificationBell />}
            <NavDropdown
              id="account-menu"
              className="app-navbar__account"
              align="end"
              active={isActive("/profile")}
              title={<>
                <img src={profileIcon} alt="" width="24" height="24" />
                <span className="visually-hidden">Account menu</span>
              </>}
            >
              <NavDropdown.Item
                as={Link}
                to="/profile"
                eventKey="/profile"
                active={isActive("/profile")}
                aria-current={pathname === "/profile" ? "page" : undefined}
              >
                Profile
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as="button" onClick={handleLogout} className="app-navbar__logout">
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
