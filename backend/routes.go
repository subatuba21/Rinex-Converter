package backend

func (s *Server) Routes() {
	s.Router.Handle("/api/upload", s.HandleUpload())
	s.Router.Handle("/", s.HandleIndex())
}
