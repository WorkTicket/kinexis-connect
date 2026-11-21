import Logo from './Logo';
import SignOut from './SignOut';
export default function Header({ user }) {
  return (<header className="top"><Logo /><div className="who">
    <a className="help-link" href="mailto:hello@kinexisdigital.com">Get help</a>
    <span className="user-email">{user.email}</span>{user.role === 'team' && <span className="pill y">Team</span>}<SignOut />
  </div></header>);
}
