package backend

func (s *Server) Routes() {
	s.Router.Handle("/", s.HandleIndex())
}
