package backend

func (s *Server) Routes() {
	s.Router.Handle("/api/upload", s.HandleUpload())
	s.Router.Handle("/", s.HandleIndex())
	s.Router.Handle("/api/example", s.HandleExample())
}
