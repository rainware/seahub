class ResourceNotExist(Exception):
    pass

class SeaflowException(Exception):
    pass

class ParamDefinitionException(Exception):
    def __init__(self, errors=None):
        self.errors = errors

class RevokeException(Exception):
    pass

class TimeoutException(Exception):
    pass

class ExternalActionFailed(Exception):
    pass
